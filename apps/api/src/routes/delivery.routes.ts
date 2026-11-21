import { Router } from 'express';
import * as c from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  deliveryOrderStatusSchema,
  registerDeliverySchema,
  toggleDutySchema,
} from '../validators/delivery.validators';

const r = Router();
r.use(authenticate);

// Registration is accessible to any logged-in user who wants to become a delivery partner
r.post('/register', validate(registerDeliverySchema), c.register);

// The remaining endpoints require delivery role (or admin)
const deliveryOrAdmin = authorize('delivery', 'admin');

r.get('/profile', deliveryOrAdmin, c.getProfile);
r.patch('/duty', deliveryOrAdmin, validate(toggleDutySchema), c.toggleDuty);
r.get('/orders/available', deliveryOrAdmin, c.getAvailableOrders);
r.post('/orders/:id/accept', deliveryOrAdmin, c.acceptOrder);
r.get('/orders/active', deliveryOrAdmin, c.getActiveOrders);
r.patch('/orders/:id/status', deliveryOrAdmin, validate(deliveryOrderStatusSchema), c.updateOrderStatus);
r.get('/earnings', deliveryOrAdmin, c.getEarnings);

export default r;
