import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address').max(254));
const strongPassword = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

// .strict() rejects unknown keys, so a client can never send `role` or `isActive` (mass assignment).
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email,
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional(),
    password: strongPassword,
  })
  .strict();

export const loginSchema = z.object({ email, password: z.string().min(1).max(72) }).strict();

export const forgotPasswordSchema = z.object({ email }).strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: strongPassword,
  })
  .strict();

