import { CookieOptions, Response } from 'express';
import { env } from '../config/env';
import * as auth from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';

const COOKIE = 'fr_refresh';
const cookieOptions: CookieOptions = {
  httpOnly: true, // not readable by page JavaScript
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 864e5,
};

function respond(res: Response, status: number, s: Awaited<ReturnType<typeof auth.login>>) {
  res.cookie(COOKIE, s.refreshToken, cookieOptions);
  res.status(status).json({ user: s.user, accessToken: s.accessToken });
}

export const register = asyncHandler(async (req, res) => respond(res, 201, await auth.register(req.body)));
export const login = asyncHandler(async (req, res) => respond(res, 200, await auth.login(req.body.email, req.body.password)));

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[COOKIE];
  if (!token) throw new AppError(401, 'No session', 'INVALID_REFRESH');
  respond(res, 200, await auth.refresh(token));
});

export const logout = asyncHandler(async (req, res) => {
  await auth.logout(req.cookies?.[COOKIE]);
  res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined });
  res.status(204).end();
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: await auth.getProfile(req.user!.id) });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  res.json(await auth.forgotPassword(req.body.email));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await auth.resetPassword(req.body.token, req.body.password);
  respond(res, 200, result);
});
