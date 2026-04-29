import { verifyAccessToken } from '../lib/tokens.js';
export function requireAuth(req, res, next) {
    // Accept Bearer token (CLI) or HTTP-only cookie (web)
    const authHeader = req.headers['authorization'];
    let token;
    if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
    }
    else if (req.cookies?.['access_token']) {
        token = req.cookies['access_token'];
    }
    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Authentication required' });
    }
    try {
        req.user = verifyAccessToken(token);
        return next();
    }
    catch {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired token' });
    }
}
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ status: 'error', message: 'Insufficient permissions' });
        }
        return next();
    };
}
//# sourceMappingURL=auth.js.map