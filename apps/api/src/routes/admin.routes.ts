import { Router } from 'express';
import * as c from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createCouponSchema,
  deliveryPartnerStatusSchema,
  refundSchema,
  restaurantStatusSchema,
  updateCouponSchema,
  updateSettingsSchema,
} from '../validators/admin.validators';

const r = Router();
r.use(authenticate);
r.use(authorize('admin'));

r.get('/stats', c.getStats);

r.get('/restaurants', c.listRestaurants);
r.patch('/restaurants/:id/status', validate(restaurantStatusSchema), c.updateRestaurantStatus);

r.get('/delivery-partners', c.listDeliveryPartners);
r.patch('/delivery-partners/:id/status', validate(deliveryPartnerStatusSchema), c.updateDeliveryPartnerStatus);

r.get('/coupons', c.listCoupons);
r.post('/coupons', validate(createCouponSchema), c.createCoupon);
r.patch('/coupons/:id', validate(updateCouponSchema), c.updateCoupon);
r.delete('/coupons/:id', c.deleteCoupon);

r.get('/orders', c.listOrders);
r.post('/orders/:id/refund', validate(refundSchema), c.processRefund);
r.post('/orders/cleanup-stale', c.cleanupStaleOrders);

r.get('/settings', c.getSettings);
r.patch('/settings', validate(updateSettingsSchema), c.updateSettings);

export default r;
