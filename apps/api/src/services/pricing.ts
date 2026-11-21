import { PRICING } from '../config/pricing';
import { AppError } from '../utils/AppError';

export interface CouponRule {
  type: 'percent' | 'flat';
  value: number; // percent (1-100) or paise
  minOrder: number;
  maxDiscount?: number | null;
}
export interface Totals { subtotal: number; discount: number; deliveryFee: number; tax: number; total: number }

export interface PricingConfig {
  deliveryFee?: number;
  freeDeliveryAbove?: number;
  taxRate?: number;
}

// All maths is in integer paise. The server always recomputes totals; client numbers are never trusted.
export function computeTotals(subtotal: number, coupon?: CouponRule | null, customPricing?: PricingConfig): Totals {
  if (!Number.isInteger(subtotal) || subtotal <= 0) throw new AppError(400, 'Cart is empty', 'EMPTY_CART');
  const dFee = customPricing?.deliveryFee ?? PRICING.deliveryFee;
  const threshold = customPricing?.freeDeliveryAbove ?? PRICING.freeDeliveryAbove;
  const tRate = customPricing?.taxRate ?? PRICING.taxRate;

  let discount = 0;
  if (coupon && subtotal >= coupon.minOrder) {
    discount = coupon.type === 'percent' ? Math.floor((subtotal * coupon.value) / 100) : coupon.value;
    if (coupon.maxDiscount != null) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(discount, subtotal);
  }
  const deliveryFee = subtotal >= threshold ? 0 : dFee;
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * tRate);
  return { subtotal, discount, deliveryFee, tax, total: taxable + deliveryFee + tax };
}
