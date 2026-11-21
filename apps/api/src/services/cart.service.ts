import { Coupon, Cart } from '../models/Commerce';
import { Food, Restaurant } from '../models/Catalog';
import { AppError } from '../utils/AppError';
import { computeTotals, CouponRule } from './pricing';

export async function resolveCoupon(userId: string, code: string, subtotal: number) {
  const c = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true }).lean();
  const now = new Date();
  if (!c || (c.validFrom && c.validFrom > now) || (c.validUntil && c.validUntil < now)) throw new AppError(400, 'This coupon is invalid or has expired', 'COUPON_INVALID');
  if (c.usageLimit != null && c.usedCount >= c.usageLimit) throw new AppError(400, 'This coupon has been fully redeemed', 'COUPON_INVALID');
  if (c.usedBy?.some((id) => String(id) === userId)) throw new AppError(400, 'You have already used this coupon', 'COUPON_INVALID');
  if (subtotal < c.minOrder) throw new AppError(400, `Minimum order for this coupon is ₹${Math.ceil(c.minOrder / 100)}`, 'COUPON_INVALID');
  return { doc: c, rule: c as CouponRule };
}

export async function getCart(userId: string, couponCode?: string) {
  const cart: any = await Cart.findOne({ user: userId }).populate('items.food').populate('restaurant', 'name slug isOpen').lean();
  const lines = ((cart?.items ?? []) as any[]).filter((i) => i.food).map((i) => ({
    foodId: String(i.food._id), name: i.food.name, price: i.food.price, isVeg: i.food.isVeg, qty: i.qty, available: i.food.isAvailable,
  }));
  const subtotal = lines.filter((l) => l.available).reduce((s, l) => s + l.price * l.qty, 0);
  let totals = null;
  let coupon: string | null = null;
  if (subtotal > 0) {
    const resolved = couponCode ? await resolveCoupon(userId, couponCode, subtotal) : null;
    totals = computeTotals(subtotal, resolved?.rule);
    coupon = resolved ? resolved.doc.code : null;
  }
  return { restaurant: cart?.restaurant ?? null, items: lines, totals, coupon, count: lines.reduce((s, l) => s + l.qty, 0) };
}

export async function addItem(userId: string, foodId: string, qty: number, replace = false) {
  const food = await Food.findById(foodId).lean();
  if (!food || !food.isAvailable) throw new AppError(404, 'This dish is not available', 'NOT_AVAILABLE');
  const rest = await Restaurant.findOne({ _id: food.restaurant, status: 'approved' }).lean();
  if (!rest) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');
  if (!rest.isOpen) throw new AppError(409, 'This restaurant is closed right now', 'RESTAURANT_CLOSED');

  const cart: any = (await Cart.findOne({ user: userId })) ?? new Cart({ user: userId, items: [] });
  if (cart.items.length && String(cart.restaurant) !== String(food.restaurant)) {
    if (!replace) throw new AppError(409, 'Your cart has items from another restaurant', 'CART_CONFLICT');
    cart.items.splice(0);
  }
  cart.restaurant = food.restaurant;
  const line = cart.items.find((i: any) => String(i.food) === foodId);
  if (line) line.qty = Math.min(20, line.qty + qty);
  else cart.items.push({ food: food._id, qty });
  await cart.save();
  return getCart(userId);
}

export async function setQty(userId: string, foodId: string, qty: number) {
  const cart: any = await Cart.findOne({ user: userId });
  if (!cart) throw new AppError(404, 'Cart is empty', 'EMPTY_CART');
  const idx = cart.items.findIndex((i: any) => String(i.food) === foodId);
  if (idx === -1) throw new AppError(404, 'Item not in cart', 'NOT_FOUND');
  if (qty === 0) cart.items.splice(idx, 1);
  else cart.items[idx].qty = qty;
  if (!cart.items.length) cart.restaurant = undefined;
  await cart.save();
  return getCart(userId);
}

export const clearCart = (userId: string) => Cart.deleteOne({ user: userId });
