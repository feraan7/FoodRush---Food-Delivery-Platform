import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Restaurant } from '../models/Catalog';
import { Coupon, Order } from '../models/Commerce';
import { User } from '../models/User';
import * as adminSvc from '../services/admin.service';

let mongod: MongoMemoryReplSet;
let adminId: string;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Restaurant.init(), Order.init(), Coupon.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Restaurant.deleteMany({}), Order.deleteMany({}), Coupon.deleteMany({})]);
  const admin = await User.create({ name: 'Admin', email: 'admin@platform.com', passwordHash: 'hash', role: 'admin' });
  adminId = String(admin._id);
});

describe('Phase 9: Admin Panel and Open Edge Cases', () => {
  it('manages restaurant approvals and suspensions', async () => {
    const rest = await Restaurant.create({ name: 'New Kitchen', slug: 'new-kitchen', status: 'pending' });
    expect(rest.status).toBe('pending');

    const approved = await adminSvc.updateRestaurantStatus(String(rest._id), 'approved');
    expect(approved.status).toBe('approved');

    const suspended = await adminSvc.updateRestaurantStatus(String(rest._id), 'suspended');
    expect(suspended.status).toBe('suspended');
  });

  it('manages coupons creation, toggling and deletion', async () => {
    const coupon = await adminSvc.createCouponAdmin({
      code: 'SUPER50',
      type: 'percent',
      value: 50,
      minOrder: 20000,
      maxDiscount: 10000,
    });
    expect(coupon.code).toBe('SUPER50');
    expect(coupon.isActive).toBe(true);

    const toggled = await adminSvc.updateCouponAdmin(String(coupon._id), { isActive: false });
    expect(toggled.isActive).toBe(false);

    const del = await adminSvc.deleteCouponAdmin(String(coupon._id));
    expect(del.success).toBe(true);
    expect(await Coupon.countDocuments({ _id: coupon._id })).toBe(0);
  });

  describe('Edge Case 1: Stale Unpaid Orders Cleanup', () => {
    it('cancels stale unpaid online orders older than cutoff and releases reserved coupon usage', async () => {
      const customer = await User.create({ name: 'Bob', email: 'bob@example.com', passwordHash: 'hash' });
      const rest = await Restaurant.create({ name: 'Rest', slug: 'rest', status: 'approved' });
      const coupon = await Coupon.create({ code: 'OFFER10', type: 'flat', value: 2000, usedCount: 1, usedBy: [customer._id] });

      // Create a stale order with createdAt 20 minutes ago
      const staleTime = new Date(Date.now() - 20 * 60 * 1000);
      const staleOrder = await Order.create({
        orderNumber: 'FRSTALE01',
        user: customer._id,
        restaurant: rest._id,
        paymentMethod: 'online',
        paymentStatus: 'unpaid',
        status: 'pending',
        couponCode: 'OFFER10',
        pricing: { subtotal: 20000, discount: 2000, deliveryFee: 3000, tax: 900, total: 21900 },
        createdAt: staleTime,
        updatedAt: staleTime,
      });

      // Run stale cleanup with 15 minute threshold
      const res = await adminSvc.cleanupStaleOrders(15);
      expect(res.cleaned).toBeGreaterThanOrEqual(1);

      // Verify order is now cancelled
      const checked = await Order.findById(staleOrder._id);
      expect(checked?.status).toBe('cancelled');
      expect(checked?.history.some((h) => h.status === 'cancelled' && h.by === 'system')).toBe(true);

      // Verify coupon usage was released
      const updatedCoupon = await Coupon.findById(coupon._id);
      expect(updatedCoupon?.usedCount).toBe(0);
      expect(updatedCoupon?.usedBy).not.toContainEqual(customer._id);
    });
  });

  describe('Edge Case 2: Refund Processing for Cancelled Paid Orders', () => {
    it('processes refund for refund_pending orders, issues refund details and notifies user', async () => {
      const customer = await User.create({ name: 'Alice', email: 'alice@example.com', passwordHash: 'hash' });
      const rest = await Restaurant.create({ name: 'Rest', slug: 'rest2', status: 'approved' });

      // An order that was paid online then cancelled, leaving paymentStatus as refund_pending
      const order = await Order.create({
        orderNumber: 'FRREFUND01',
        user: customer._id,
        restaurant: rest._id,
        paymentMethod: 'online',
        paymentStatus: 'refund_pending',
        status: 'cancelled',
        pricing: { subtotal: 30000, discount: 0, deliveryFee: 3000, tax: 1500, total: 34500 },
        history: [
          { status: 'pending', by: 'customer' },
          { status: 'cancelled', by: 'customer' },
        ],
      });

      // Admin processes the refund
      const refundedOrder = await adminSvc.processOrderRefund(String(order._id), adminId, 'Approved customer refund');
      expect(refundedOrder.paymentStatus).toBe('refunded');
      expect(refundedOrder.refundDetails).toBeDefined();
      expect(refundedOrder.refundDetails?.refundId).toMatch(/^ref_/);
      expect(refundedOrder.refundDetails?.amount).toBe(34500);
      expect(refundedOrder.refundDetails?.reason).toBe('Approved customer refund');

      // Order history reflects refund
      expect(refundedOrder.history.some((h) => h.status === 'refunded' && h.by === 'admin')).toBe(true);
    });

    it('rejects refund processing if order is not in refund_pending state', async () => {
      const customer = await User.create({ name: 'Charlie', email: 'charlie@example.com', passwordHash: 'hash' });
      const rest = await Restaurant.create({ name: 'Rest', slug: 'rest3', status: 'approved' });

      const paidOrder = await Order.create({
        orderNumber: 'FRPAID01',
        user: customer._id,
        restaurant: rest._id,
        paymentMethod: 'online',
        paymentStatus: 'paid',
        status: 'delivered',
        pricing: { subtotal: 10000, discount: 0, deliveryFee: 3000, tax: 500, total: 13500 },
      });

      await expect(adminSvc.processOrderRefund(String(paidOrder._id), adminId)).rejects.toThrow();
    });
  });

  describe('Dynamic Platform Settings', () => {
    it('saves custom platform pricing rules', async () => {
      const settings = await adminSvc.updateAdminPlatformSettings({
        deliveryFee: 4000,
        freeDeliveryThreshold: 60000,
        taxRatePercent: 12,
        commissionRatePercent: 20,
        deliveryPartnerBaseFee: 4500,
      });

      expect(settings.deliveryFee).toBe(4000);
      expect(settings.freeDeliveryThreshold).toBe(60000);
      expect(settings.taxRatePercent).toBe(12);
      expect(settings.commissionRatePercent).toBe(20);
      expect(settings.deliveryPartnerBaseFee).toBe(4500);
    });
  });
});
