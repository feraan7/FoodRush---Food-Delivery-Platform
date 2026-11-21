import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { Role } from '../types';

const ALG = 'HS256' as const;

export const signAccessToken = (userId: string, role: Role) =>
  jwt.sign({ role }, env.JWT_ACCESS_SECRET, {
    subject: userId,
    algorithm: ALG,
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
  });

export const verifyAccessToken = (token: string) =>
  jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: [ALG] }) as jwt.JwtPayload & { role: Role };

export const signRefreshToken = (userId: string) =>
  jwt.sign({ jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    subject: userId,
    algorithm: ALG,
    expiresIn: `${env.REFRESH_TOKEN_TTL_DAYS}d` as SignOptions['expiresIn'],
  });

export const verifyRefreshToken = (token: string) =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { algorithms: [ALG] }) as jwt.JwtPayload;

// Refresh tokens are stored only as SHA-256 hashes.
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
