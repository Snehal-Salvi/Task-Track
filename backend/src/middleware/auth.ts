import type { Request, RequestHandler, Response } from 'express';
import jwt from 'jsonwebtoken';

const COOKIE = 'tasktrack_session';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const secret = () => {
  const value = process.env.JWT_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET is not set');
  return 'development-only-secret';
};

const cookieOptions = () => ({
  httpOnly: true, // browser scripts cannot read it, so an XSS bug cannot steal the session
  sameSite: 'lax' as const, // not sent on forms posted from other sites
  secure: process.env.NODE_ENV === 'production', // https only once deployed
});

export function startSession(res: Response, userId: string) {
  const token = jwt.sign({}, secret(), { subject: userId, expiresIn: '7d', algorithm: 'HS256' });
  res.cookie(COOKIE, token, { ...cookieOptions(), maxAge: WEEK_MS });
}

export function endSession(res: Response) {
  res.clearCookie(COOKIE, cookieOptions());
}

export function sessionUserId(req: Request): string | null {
  try {
    const { sub } = jwt.verify(req.cookies?.[COOKIE] ?? '', secret(), { algorithms: ['HS256'] });
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const userId = sessionUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'Log in to continue' });
    return;
  }
  res.locals.userId = userId;
  next();
};
