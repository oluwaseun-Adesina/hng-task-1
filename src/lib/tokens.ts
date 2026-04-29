import jwt from 'jsonwebtoken';
import { uuidv7 } from 'uuidv7';
import { prisma } from './db.js';

const ACCESS_SECRET = process.env['JWT_ACCESS_SECRET']!;
const REFRESH_SECRET = process.env['JWT_REFRESH_SECRET']!;

export interface AccessTokenPayload {
  sub: string;
  role: string;
  username: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '3m' });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = uuidv7();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  await prisma.refreshToken.create({
    data: { id: uuidv7(), token, user_id: userId, expires_at },
  });
  return token;
}

export async function rotateRefreshToken(
  oldToken: string
): Promise<{ accessToken: string; refreshToken: string } | null> {
  const record = await prisma.refreshToken.findUnique({ where: { token: oldToken }, include: { user: true } });
  if (!record || record.expires_at < new Date()) {
    if (record) await prisma.refreshToken.delete({ where: { token: oldToken } });
    return null;
  }

  await prisma.refreshToken.delete({ where: { token: oldToken } });

  if (!record.user.is_active) return null;

  const accessToken = signAccessToken({
    sub: record.user.id,
    role: record.user.role,
    username: record.user.username,
  });
  const refreshToken = await issueRefreshToken(record.user.id);
  return { accessToken, refreshToken };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.deleteMany({ where: { token } });
}
