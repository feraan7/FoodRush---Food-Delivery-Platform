import { z } from 'zod';
import * as svc from '../services/favourite.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const toggleSchema = z
  .object({
    type: z.enum(['restaurant', 'food']),
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID'),
  })
  .strict();

export const toggle = asyncHandler(async (req, res) => {
  res.json(await svc.toggleFavourite(uid(req), req.body.type, req.body.id));
});

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.getFavourites(uid(req)));
});
