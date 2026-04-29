import { Router, type Request, type Response } from 'express';
import axios from 'axios';
import { uuidv7 } from 'uuidv7';
import { prisma } from '../lib/db.js';
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../lib/tokens.js';

const router = Router();

const GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID']!;
const GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_SECRET']!;
const FRONTEND_URL = process.env['FRONTEND_URL'] ?? 'http://localhost:3000';

// GET /auth/github — redirect to GitHub OAuth
router.get('/github', (req: Request, res: Response) => {
  const state = req.query['state'] as string | undefined;
  const codeChallenge = req.query['code_challenge'] as string | undefined;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    scope: 'read:user user:email',
  });
  if (state) params.set('state', state);
  if (codeChallenge) params.set('code_challenge', codeChallenge);
  if (codeChallenge) params.set('code_challenge_method', 'S256');

  return res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// GET /auth/github/callback — handle OAuth callback
router.get('/github/callback', async (req: Request, res: Response) => {
  const { code, state, code_verifier, source } = req.query as Record<string, string>;

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'Missing authorization code' });
  }

  try {
    const tokenParams: Record<string, string> = {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    };
    if (code_verifier) tokenParams['code_verifier'] = code_verifier;

    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      tokenParams,
      { headers: { Accept: 'application/json' } }
    );

    const githubAccessToken = (tokenRes.data as Record<string, string>)['access_token'];
    if (!githubAccessToken) {
      return res.status(502).json({ status: 'error', message: 'Failed to obtain GitHub access token' });
    }

    const [userRes, emailRes] = await Promise.all([
      axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
      axios.get('https://api.github.com/user/emails', {
        headers: { Authorization: `Bearer ${githubAccessToken}` },
      }),
    ]);

    const ghUser = userRes.data as Record<string, unknown>;
    const emails = emailRes.data as Array<{ email: string; primary: boolean; verified: boolean }>;
    const primaryEmail = emails.find(e => e.primary && e.verified)?.email ?? null;

    const github_id = String(ghUser['id']);
    const username = String(ghUser['login']);
    const avatar_url = ghUser['avatar_url'] ? String(ghUser['avatar_url']) : null;

    let user = await prisma.user.findUnique({ where: { github_id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: uuidv7(),
          github_id,
          username,
          email: primaryEmail,
          avatar_url,
          role: 'analyst',
        },
      });
    } else {
      user = await prisma.user.update({
        where: { github_id },
        data: { username, email: primaryEmail ?? user.email, avatar_url, last_login_at: new Date() },
      });
    }

    if (!user.is_active) {
      return res.status(403).json({ status: 'error', message: 'Account is disabled' });
    }

    const accessToken = signAccessToken({ sub: user.id, role: user.role, username: user.username });
    const refreshToken = await issueRefreshToken(user.id);

    // CLI flow: return JSON
    if (source === 'cli' || req.headers['accept']?.includes('application/json')) {
      return res.json({
        status: 'success',
        access_token: accessToken,
        refresh_token: refreshToken,
        user: { id: user.id, username: user.username, role: user.role, avatar_url: user.avatar_url },
      });
    }

    // Web flow: set HTTP-only cookies and redirect
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });

    const redirectTo = state
      ? `${FRONTEND_URL}/dashboard?state=${encodeURIComponent(state)}`
      : `${FRONTEND_URL}/dashboard`;
    return res.redirect(redirectTo);
  } catch (err) {
    console.error('GitHub callback error:', err);
    return res.status(500).json({ status: 'error', message: 'Authentication failed' });
  }
});

// POST /auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  // Accept token from body (CLI) or cookie (web)
  const token = (body['refresh_token'] as string) ?? req.cookies?.['refresh_token'];

  if (!token) {
    return res.status(400).json({ status: 'error', message: 'Missing refresh_token' });
  }

  const result = await rotateRefreshToken(token);
  if (!result) {
    return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
  }

  // Web: update cookies
  if (!body['refresh_token'] && req.cookies?.['refresh_token']) {
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000,
    });
  }

  return res.json({
    status: 'success',
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
  });
});

// POST /auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  const token = (body['refresh_token'] as string) ?? req.cookies?.['refresh_token'];

  if (token) await revokeRefreshToken(token);

  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  return res.json({ status: 'success', message: 'Logged out' });
});

export default router;
