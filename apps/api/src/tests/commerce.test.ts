import { describe, expect, it } from 'vitest';
import { makeMockProvider, makeRazorpayProvider } from '../providers/payment';
import { canTransition } from '../services/orderState';
import { computeTotals } from '../services/pricing';

describe('pricing (paise)', () => {
  it('adds delivery fee and 5% tax below the free-delivery threshold', () => {
    expect(computeTotals(20000)).toEqual({ subtotal: 20000, discount: 0, deliveryFee: 3000, tax: 1000, total: 24000 });
  });
  it('waives delivery at or above ₹499', () => {
    expect(computeTotals(49900).deliveryFee).toBe(0);
  });
  it('applies percent coupons with a cap, taxing the discounted amount', () => {
    const t = computeTotals(30000, { type: 'percent', value: 20, minOrder: 19900, maxDiscount: 10000 });
    expect(t.discount).toBe(6000);
    expect(t.tax).toBe(1200); // 5% of 24000
    expect(t.total).toBe(24000 + 3000 + 1200);
  });
  it('caps percent discounts at maxDiscount and flat discounts at the subtotal', () => {
    expect(computeTotals(100000, { type: 'percent', value: 50, minOrder: 0, maxDiscount: 10000 }).discount).toBe(10000);
    expect(computeTotals(3000, { type: 'flat', value: 5000, minOrder: 0 }).discount).toBe(3000);
  });
  it('ignores a coupon below its minimum order', () => {
    expect(computeTotals(10000, { type: 'flat', value: 5000, minOrder: 29900 }).discount).toBe(0);
  });
  it('rejects empty or fractional subtotals', () => {
    expect(() => computeTotals(0)).toThrow();
    expect(() => computeTotals(10.5)).toThrow();
  });
});

describe('order state machine', () => {
  it('allows the happy path with the right actors', () => {
    expect(canTransition('pending', 'confirmed', 'restaurant')).toBe(true);
    expect(canTransition('ready_for_pickup', 'picked_up', 'delivery')).toBe(true);
    expect(canTransition('out_for_delivery', 'delivered', 'delivery')).toBe(true);
  });
  it('blocks wrong actors, skipped steps and moves out of final states', () => {
    expect(canTransition('pending', 'confirmed', 'customer')).toBe(false);
    expect(canTransition('pending', 'delivered', 'admin')).toBe(false);
    expect(canTransition('delivered', 'cancelled', 'admin')).toBe(false);
    expect(canTransition('cancelled', 'pending', 'admin')).toBe(false);
  });
  it('lets customers cancel only before preparation', () => {
    expect(canTransition('confirmed', 'cancelled', 'customer')).toBe(true);
    expect(canTransition('preparing', 'cancelled', 'customer')).toBe(false);
  });
});

describe('payment signatures', () => {
  const mock = makeMockProvider('s3cret');
  it('accepts a correct signature and rejects tampered ids or signatures', () => {
    const sig = mock.sign('order_1', 'pay_1');
    expect(mock.verify({ gatewayOrderId: 'order_1', gatewayPaymentId: 'pay_1', signature: sig })).toBe(true);
    expect(mock.verify({ gatewayOrderId: 'order_1', gatewayPaymentId: 'pay_2', signature: sig })).toBe(false);
    expect(mock.verify({ gatewayOrderId: 'order_2', gatewayPaymentId: 'pay_1', signature: sig })).toBe(false);
    expect(mock.verify({ gatewayOrderId: 'order_1', gatewayPaymentId: 'pay_1', signature: 'abc' })).toBe(false);
  });
  it('Razorpay verification matches the documented HMAC-SHA256 of "order|payment"', () => {
    const rz = makeRazorpayProvider('key', 'secret');
    // Computed independently: HMAC-SHA256("secret", "order_9|pay_9")
    const expected = require('crypto').createHmac('sha256', 'secret').update('order_9|pay_9').digest('hex');
    expect(rz.verify({ gatewayOrderId: 'order_9', gatewayPaymentId: 'pay_9', signature: expected })).toBe(true);
    expect(rz.verify({ gatewayOrderId: 'order_9', gatewayPaymentId: 'pay_9', signature: expected.replace(/^./, 'x') })).toBe(false);
  });
});
