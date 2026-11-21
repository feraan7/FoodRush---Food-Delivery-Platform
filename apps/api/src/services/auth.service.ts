import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { HydratedDocument } from 'mongoose';
import { env } from '../config/env';
import { IUser, User } from '../models/User';
import { AppError } from '../utils/AppError';
import { hashToken, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokens';

const COST = env.NODE_ENV === 'test' ? 4 : 12;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const MAX_SESSIONS = 5;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', COST);

type UserDoc = HydratedDocument<IUser>;

async function issueSession(user: UserDoc) {
  const refreshToken = signRefreshToken(user.id);
  const accessToken = signAccessToken(user.id, user.role);
  const now = new Date();
  const live = (user.sessions ?? []).filter((s) => s.expiresAt > now);
  live.push({ tokenHash: hashToken(refreshToken), expiresAt: new Date(now.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 864e5) });
  user.sessions = live.slice(-MAX_SESSIONS);
  await user.save();
  return { user, accessToken, refreshToken };
}

export async function register(input: { name: string; email: string; phone?: string; password: string }) {
  const passwordHash = await bcrypt.hash(input.password, COST);
  try {
    // Role is never taken from input: public sign-up always creates a customer.
    const user = await User.create({ name: input.name, email: input.email, phone: input.phone, passwordHash, role: 'customer' });
    return issueSession(user);
  } catch (err: any) {
    if (err?.code === 11000) throw new AppError(409, 'An account with this email already exists', 'EMAIL_TAKEN');
    throw err;
  }
}

export async function login(email: string, password: string) {
  const invalid = new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  const user = await User.findOne({ email }).select('+passwordHash +failedLogins +lockUntil +sessions');
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user) throw invalid;
  if (user.lockUntil && user.lockUntil > new Date()) {
    throw new AppError(429, 'Too many failed attempts. Try again in a few minutes.', 'ACCOUNT_LOCKED');
  }
  if (!ok) {
    user.failedLogins += 1;
    if (user.failedLogins >= MAX_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_MS);
      user.failedLogins = 0;
    }
    await user.save();
    throw invalid;
  }
  if (!user.isActive) throw new AppError(403, 'This account has been deactivated', 'ACCOUNT_DISABLED');
  user.failedLogins = 0;
  user.lockUntil = undefined;
  return issueSession(user);
}

// Refresh-token rotation: each token works once. Presenting an already-used token
// signals theft, so every session of that user is revoked.
export async function refresh(token: string) {
  let sub: string;
  try {
    sub = verifyRefreshToken(token).sub as string;
  } catch {
    throw new AppError(401, 'Session expired, please log in again', 'INVALID_REFRESH');
  }
  const user = await User.findById(sub).select('+sessions');
  if (!user || !user.isActive) throw new AppError(401, 'Session expired, please log in again', 'INVALID_REFRESH');
  const hash = hashToken(token);
  const idx = user.sessions.findIndex((s) => s.tokenHash === hash);
  if (idx === -1) {
    user.sessions = [];
    await user.save();
    throw new AppError(401, 'Session expired, please log in again', 'INVALID_REFRESH');
  }
  user.sessions.splice(idx, 1);
  return issueSession(user);
}

export async function logout(token?: string) {
  if (!token) return;
  try {
    const { sub } = verifyRefreshToken(token);
    await User.updateOne({ _id: sub }, { $pull: { sessions: { tokenHash: hashToken(token) } } });
  } catch {
    /* an invalid token needs no cleanup */
  }
}

export async function getProfile(id: string) {
  const user = await User.findById(id);
  if (!user || !user.isActive) throw new AppError(401, 'Account not available', 'UNAUTHENTICATED');
  return user;
}

export async function forgotPassword(email: string) {
  const user = await User.findOne({ email });
  if (!user || !user.isActive) {
    return { message: 'If an account exists, a password reset token has been generated.' };
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 3600_000); // 1 hour
  await user.save();

  return {
    message: 'If an account exists, a password reset token has been generated.',
    resetToken: rawToken, // Provided for developer testing / demo UI
  };
}

export async function resetPassword(token: string, newPass: string) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+passwordHash +sessions');

  if (!user) {
    throw new AppError(400, 'Invalid or expired password reset token', 'INVALID_TOKEN');
  }

  user.passwordHash = await bcrypt.hash(newPass, COST);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  user.sessions = [];
  await user.save();

  return issueSession(user);
}
