import { Router } from 'express';
import * as c from '../controllers/restaurant.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createFoodSchema,
  restaurantOrderStatusSchema,
  updateFoodSchema,
  updateRestaurantProfileSchema,
} from '../validators/restaurant.validators';

const r = Router();
r.use(authenticate);
r.use(authorize('restaurant', 'admin'));

r.get('/profile', c.getProfile);
r.patch('/profile', validate(updateRestaurantProfileSchema), c.updateProfile);

r.get('/menu', c.getMenu);
r.post('/menu', validate(createFoodSchema), c.createFood);
r.patch('/menu/:id', validate(updateFoodSchema), c.updateFood);
r.patch('/menu/:id/toggle', c.toggleFoodAvailability);
r.delete('/menu/:id', c.deleteFood);

r.get('/orders', c.getOrders);
r.patch('/orders/:id/status', validate(restaurantOrderStatusSchema), c.updateOrderStatus);

r.get('/analytics', c.getAnalytics);

export default r;
