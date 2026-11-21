import { Router } from 'express';
import * as c from '../controllers/commerce.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { addItemSchema, createOrderSchema, setQtySchema, statusSchema, verifyPaymentSchema } from '../validators/commerce.validators';

const r = Router();
r.use(authenticate);

// Any authenticated account (customer, admin, restaurant, delivery) can manage a personal cart & place orders
const canShop = authorize('customer', 'admin', 'restaurant', 'delivery');
r.get('/cart', canShop, c.getCart);
r.post('/cart/items', canShop, validate(addItemSchema), c.addItem);
r.patch('/cart/items/:foodId', canShop, validate(setQtySchema), c.setQty);
r.delete('/cart', canShop, c.emptyCart);

r.post('/orders', canShop, validate(createOrderSchema), c.createOrder);
r.get('/orders', canShop, c.listOrders);
r.get('/orders/:id', c.getOrder);
r.patch('/orders/:id/status', validate(statusSchema), c.updateStatus);
r.post('/orders/:id/payment/verify', canShop, validate(verifyPaymentSchema), c.verifyPayment);
r.post('/orders/:id/payment/mock-pay', canShop, c.mockPay);
export default r;
