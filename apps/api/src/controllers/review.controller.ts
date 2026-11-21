import { z } from 'zod';
import * as svc from '../services/review.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const createReviewSchema = z
  .object({
    orderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid order ID'),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  })
  .strict();

export const createReview = asyncHandler(async (req, res) => {
  res.status(201).json({ review: await svc.addReview(uid(req), req.body) });
});

export const getReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  res.json(await svc.getRestaurantReviews(req.params.restaurantId, page, limit));
});
