import { RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../utils/AppError';

export const validate =
  (schema: z.ZodType): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR', z.flattenError(result.error).fieldErrors));
    }
    req.body = result.data;
    next();
  };
