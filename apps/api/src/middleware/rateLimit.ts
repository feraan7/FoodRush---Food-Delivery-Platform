import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

const base = { standardHeaders: 'draft-7' as const, legacyHeaders: false, skip: () => env.NODE_ENV === 'test' };
const body = (message: string) => ({ error: { code: 'RATE_LIMITED', message } });

export const globalLimiter = rateLimit({ ...base, windowMs: 60_000, limit: 120, message: body('Too many requests, slow down.') });
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60_000, limit: 20, message: body('Too many attempts, try again later.') });
