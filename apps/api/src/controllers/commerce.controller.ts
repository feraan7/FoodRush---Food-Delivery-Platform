import { z } from 'zod';
import * as cart from '../services/cart.service';
import * as orders from '../services/order.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { cartQuery, objectId, pageQuery } from '../validators/commerce.validators';

const uid = (req: any) => req.user!.id as string;
const idParam = (req: any, name = 'id') => objectId.parse(req.params[name]);

export const getCart = asyncHandler(async (req, res) => res.json(await cart.getCart(uid(req), cartQuery.parse(req.query).coupon)));
export const addItem = asyncHandler(async (req, res) => res.json(await cart.addItem(uid(req), req.body.foodId, req.body.qty, req.body.replace)));
export const setQty = asyncHandler(async (req, res) => res.json(await cart.setQty(uid(req), idParam(req, 'foodId'), req.body.qty)));
export const emptyCart = asyncHandler(async (req, res) => { await cart.clearCart(uid(req)); res.status(204).end(); });

export const createOrder = asyncHandler(async (req, res) => {
  const key = req.header('Idempotency-Key');
  if (key !== undefined && !z.string().min(8).max(100).safeParse(key).success) throw new AppError(400, 'Invalid Idempotency-Key', 'VALIDATION_ERROR');
  const r = await orders.createOrder(uid(req), { ...req.body, idempotencyKey: key });
  res.status(201).json(r);
});
export const verifyPayment = asyncHandler(async (req, res) => res.json({ order: await orders.verifyPayment(uid(req), idParam(req), req.body) }));
export const mockPay = asyncHandler(async (req, res) => res.json(await orders.mockPay(uid(req), idParam(req))));
export const updateStatus = asyncHandler(async (req, res) => res.json({ order: await orders.updateStatus(req.user!, idParam(req), req.body.status) }));
export const listOrders = asyncHandler(async (req, res) => { const q = pageQuery.parse(req.query); res.json(await orders.listOrders(uid(req), q.page, q.limit)); });
export const getOrder = asyncHandler(async (req, res) => res.json({ order: await orders.getOrder(req.user!, idParam(req)) }));
