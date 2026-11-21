import crypto from 'crypto';
import { Restaurant } from '../models/Catalog';
import { Cart, Coupon, Order, Payment } from '../models/Commerce';
import { mockProvider, paymentProvider } from '../providers/payment';
import { emitOrderUpdate } from '../sockets';
import { AppError } from '../utils/AppError';
import { clearCart, resolveCoupon } from './cart.service';
import { Actor, canTransition, OrderStatus } from './orderState';
import { computeTotals } from './pricing';

export interface Address { name: string; phone: string; line1: string; city: string; pincode: string }
const orderNumber = () => `FR${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

async function onPaymentSettled(order: any, by: string) {
  await clearCart(String(order.user));
  if (order.couponCode) {
    await Coupon.updateOne({ code: order.couponCode, usedBy: { $ne: order.user } }, { $inc: { usedCount: 1 }, $addToSet: { usedBy: order.user } });
  }
  emitOrderUpdate(order);
  void by;
}

export async function createOrder(userId: string, input: { address: Address; paymentMethod: 'cod' | 'online'; couponCode?: string; idempotencyKey?: string }) {
  if (input.idempotencyKey) {
    const existing = await Order.findOne({ user: userId, idempotencyKey: input.idempotencyKey });
    if (existing) return { order: existing, payment: await paymentInfo(existing) }; // a retry returns the same order
  }
  const cart: any = await Cart.findOne({ user: userId }).populate('items.food');
  if (!cart?.items.length) throw new AppError(400, 'Your cart is empty', 'EMPTY_CART');
  const restaurant = await Restaurant.findOne({ _id: cart.restaurant, status: 'approved' }).lean();
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');
  if (!restaurant.isOpen) throw new AppError(409, 'This restaurant is closed right now', 'RESTAURANT_CLOSED');

  // Prices and availability come from the database, never from the client.
  const items = cart.items.map((i: any) => {
    if (!i.food || !i.food.isAvailable || String(i.food.restaurant) !== String(restaurant._id)) {
      throw new AppError(409, `${i.food?.name ?? 'An item'} is no longer available. Please review your cart.`, 'NOT_AVAILABLE');
    }
    return { food: i.food._id, name: i.food.name, price: i.food.price, qty: i.qty, isVeg: i.food.isVeg };
  });
  const subtotal = items.reduce((s: number, i: any) => s + i.price * i.qty, 0);
  const resolved = input.couponCode ? await resolveCoupon(userId, input.couponCode, subtotal) : null;
  const pricing = computeTotals(subtotal, resolved?.rule);

  let order;
  try {
    order = await Order.create({
      orderNumber: orderNumber(), user: userId, restaurant: restaurant._id, items, address: input.address, pricing,
      couponCode: resolved?.doc.code, paymentMethod: input.paymentMethod, idempotencyKey: input.idempotencyKey,
      paymentStatus: input.paymentMethod === 'cod' ? 'cod' : 'unpaid', status: 'pending', history: [{ status: 'pending', by: 'customer' }],
    });
  } catch (e: any) {
    if (e?.code === 11000 && input.idempotencyKey) {
      const dup = await Order.findOne({ user: userId, idempotencyKey: input.idempotencyKey });
      if (dup) return { order: dup, payment: await paymentInfo(dup) };
    }
    throw e;
  }

  if (input.paymentMethod === 'cod') {
    await onPaymentSettled(order, 'cod');
    return { order, payment: null };
  }
  const { gatewayOrderId } = await paymentProvider.createOrder(pricing.total, order.orderNumber);
  await Payment.create({ order: order._id, provider: paymentProvider.name, gatewayOrderId, amount: pricing.total });
  return { order, payment: await paymentInfo(order) };
}

async function paymentInfo(order: any) {
  if (order.paymentMethod !== 'online') return null;
  const p = await Payment.findOne({ order: order._id }).lean();
  if (!p) return null;
  return { provider: p.provider, gatewayOrderId: p.gatewayOrderId, amount: p.amount, publicKey: paymentProvider.publicKey, status: p.status };
}

// Payment success is decided only by verifying the gateway signature on the server.
export async function verifyPayment(userId: string, orderId: string, input: { gatewayPaymentId: string; signature: string }) {
  const order = await Order.findOne({ _id: orderId, user: userId });
  if (!order || order.paymentMethod !== 'online') throw new AppError(404, 'Order not found', 'NOT_FOUND');
  const payment = await Payment.findOne({ order: order._id });
  if (!payment) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
  if (payment.status === 'paid') return order; // already processed: idempotent, nothing is applied twice

  if (!paymentProvider.verify({ gatewayOrderId: payment.gatewayOrderId, gatewayPaymentId: input.gatewayPaymentId, signature: input.signature })) {
    throw new AppError(400, 'Payment verification failed', 'PAYMENT_INVALID');
  }
  // Atomic "created -> paid" switch: only one concurrent request can win it.
  let won;
  try {
    won = await Payment.findOneAndUpdate({ _id: payment._id, status: 'created' }, { status: 'paid', gatewayPaymentId: input.gatewayPaymentId }, { new: true });
  } catch (e: any) {
    if (e?.code === 11000) throw new AppError(409, 'This payment was already used', 'PAYMENT_DUPLICATE');
    throw e;
  }
  if (!won) return Order.findById(order._id);
  const paid = await Order.findOneAndUpdate({ _id: order._id }, { paymentStatus: 'paid' }, { new: true });
  await onPaymentSettled(paid, 'payment');
  return paid;
}

// Development only: produces a valid mock gateway payment so the full flow can run without credentials.
export async function mockPay(userId: string, orderId: string) {
  if (paymentProvider.name !== 'mock') throw new AppError(404, 'Not found', 'NOT_FOUND');
  const payment = await Payment.findOne({ order: orderId }).populate('order');
  if (!payment || String((payment.order as any).user) !== userId) throw new AppError(404, 'Payment not found', 'NOT_FOUND');
  const gatewayPaymentId = `mock_pay_${crypto.randomBytes(8).toString('hex')}`;
  return { gatewayPaymentId, signature: mockProvider.sign(payment.gatewayOrderId, gatewayPaymentId) };
}

async function actorFor(user: { id: string; role: string }, order: any): Promise<Actor | null> {
  if (user.role === 'admin') return 'admin';
  if (String(order.user) === user.id) return 'customer';
  if (user.role === 'delivery') return order.partner && String(order.partner) === user.id ? 'delivery' : null;
  if (user.role === 'restaurant') return (await Restaurant.exists({ _id: order.restaurant, owner: user.id })) ? 'restaurant' : null;
  return null;
}

export async function updateStatus(user: { id: string; role: string }, orderId: string, to: OrderStatus) {
  const order = await Order.findById(orderId);
  const actor = order && (await actorFor(user, order));
  if (!order || !actor) throw new AppError(404, 'Order not found', 'NOT_FOUND'); // 404, not 403: don't reveal other people's orders
  if (order.paymentStatus === 'unpaid') throw new AppError(409, 'Order is awaiting payment', 'AWAITING_PAYMENT');
  if (!canTransition(order.status as OrderStatus, to, actor)) throw new AppError(409, `Cannot move an order from ${order.status} to ${to}`, 'INVALID_TRANSITION');

  const set: Record<string, unknown> = { status: to };
  if (to === 'cancelled' && order.paymentStatus === 'paid') set.paymentStatus = 'refund_pending';
  // The status check in the filter makes concurrent updates safe: the second one matches nothing.
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { $set: set, $push: { history: { status: to, by: actor, at: new Date() } } }, { new: true });
  if (!updated) throw new AppError(409, 'Order was just updated, please refresh', 'CONFLICT');
  emitOrderUpdate(updated);
  return updated;
}

export async function listOrders(userId: string, page: number, limit: number) {
  const [items, total] = await Promise.all([
    Order.find({ user: userId }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('restaurant', 'name slug emoji').lean(),
    Order.countDocuments({ user: userId }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function getOrder(user: { id: string; role: string }, orderId: string) {
  const order = await Order.findById(orderId).populate('restaurant', 'name slug emoji').lean();
  const allowed = order && (user.role === 'admin' || String(order.user) === user.id || (user.role === 'delivery' && String(order.partner) === user.id) ||
    (user.role === 'restaurant' && (await Restaurant.exists({ _id: (order.restaurant as any)._id, owner: user.id }))));
  if (!order || !allowed) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  return { ...order, payment: await Payment.findOne({ order: order._id }).select('provider status').lean() };
}
