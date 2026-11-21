import { RequestHandler } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';
import { Role } from '../types';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub as string, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired token', 'INVALID_TOKEN'));
  }
};

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(new AppError(401, 'Authentication required', 'UNAUTHENTICATED'));
    if (!roles.includes(req.user.role)) return next(new AppError(403, 'You do not have access to this resource', 'FORBIDDEN'));
    next();
  };
