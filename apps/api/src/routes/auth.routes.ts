import { Router } from 'express';
import * as c from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/auth.validators';

const r = Router();
r.post('/register', authLimiter, validate(registerSchema), c.register);
r.post('/login', authLimiter, validate(loginSchema), c.login);
r.post('/refresh', authLimiter, c.refresh);
r.post('/logout', c.logout);
r.get('/me', authenticate, c.me);
r.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), c.forgotPassword);
r.post('/reset-password', authLimiter, validate(resetPasswordSchema), c.resetPassword);
export default r;
