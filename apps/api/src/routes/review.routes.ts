import { Router } from 'express';
import * as c from '../controllers/review.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const r = Router();

// Public: view reviews for a restaurant
r.get('/restaurants/:restaurantId/reviews', c.getReviews);

// Customer: submit a review
r.post('/reviews', authenticate, validate(c.createReviewSchema), c.createReview);

export default r;
