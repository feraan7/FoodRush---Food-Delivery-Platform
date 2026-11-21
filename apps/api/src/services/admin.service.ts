import crypto from 'crypto';
import { Restaurant } from '../models/Catalog';
import { Coupon, Order, Payment } from '../models/Commerce';
import { getPlatformSettings, PlatformSettings } from '../models/PlatformSettings';
import { User } from '../models/User';
import { emitOrderUpdate } from '../sockets';
import { AppError } from '../utils/AppError';
import { createNotification } from './notification.service';

export async function getAdminStats() {
  const [totalUsers, totalRestaurants, totalDeliveryPartners, allOrders] = await Promise.all([
    User.countDocuments({ role: 'customer' }),
    Restaurant.countDocuments(),
    User.countDocuments({ role: 'delivery' }),
    Order.find().lean(),
  ]);

  const pendingRestaurants = await Restaurant.countDocuments({ status: 'pending' });
  const approvedRestaurants = await Restaurant.countDocuments({ status: 'approved' });

  const deliveredOrders = allOrders.filter((o) => o.status === 'delivered');
  const totalSales = deliveredOrders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
  const settings = await getPlatformSettings();
  const commissionRate = settings.commissionRatePercent || 15;
  const totalCommission = Math.round((totalSales * commissionRate) / 100);

  const statusBreakdown: Record<string, number> = {};
  for (const o of allOrders) {
    statusBreakdown[o.status] = (statusBreakdown[o.status] || 0) + 1;
  }

  const pendingRefundsCount = allOrders.filter((o) => o.paymentStatus === 'refund_pending').length;

  return {
    totalSales,
    totalOrders: allOrders.length,
    deliveredOrdersCount: deliveredOrders.length,
    totalCommission,
    totalCustomers: totalUsers,
    totalRestaurants,
    pendingRestaurants,
    approvedRestaurants,
    totalDeliveryPartners,
    statusBreakdown,
    pendingRefundsCount,
  };
}

export async function listRestaurantsAdmin(status?: string) {
  const filter: any = {};
  if (status && status !== 'all') filter.status = status;
  return Restaurant.find(filter).populate('owner', 'name email phone').sort({ createdAt: -1 }).lean();
}

export async function updateRestaurantStatus(id: string, status: 'approved' | 'rejected' | 'pending' | 'suspended') {
  const rest = await Restaurant.findByIdAndUpdate(id, { status }, { new: true });
  if (!rest) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');
  return rest;
}

export async function listDeliveryPartnersAdmin() {
  return User.find({ role: 'delivery' }).sort({ createdAt: -1 }).lean();
}

export async function updateDeliveryPartnerStatus(id: string, status: 'approved' | 'rejected' | 'pending') {
  const partner = await User.findOneAndUpdate(
    { _id: id, role: 'delivery' },
    { 'deliveryProfile.status': status },
    { new: true },
  );
  if (!partner) throw new AppError(404, 'Delivery partner not found', 'NOT_FOUND');
  return partner;
}

export async function listCouponsAdmin() {
  return Coupon.find().sort({ createdAt: -1 }).lean();
}

export async function createCouponAdmin(data: {
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  validFrom?: Date;
  validUntil?: Date;
  usageLimit?: number;
  isActive?: boolean;
}) {
  const code = data.code.trim().toUpperCase();
  const existing = await Coupon.findOne({ code });
  if (existing) throw new AppError(409, 'Coupon code already exists', 'COUPON_EXISTS');

  return Coupon.create({
    code,
    type: data.type,
    value: data.value,
    minOrder: data.minOrder || 0,
    maxDiscount: data.maxDiscount,
    validFrom: data.validFrom,
    validUntil: data.validUntil,
    usageLimit: data.usageLimit,
    isActive: data.isActive ?? true,
  });
}

export async function updateCouponAdmin(
  id: string,
  data: {
    type?: 'percent' | 'flat';
    value?: number;
    minOrder?: number;
    maxDiscount?: number;
    validFrom?: Date;
    validUntil?: Date;
    usageLimit?: number;
    isActive?: boolean;
  },
) {
  const coupon = await Coupon.findByIdAndUpdate(id, { $set: data }, { new: true });
  if (!coupon) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');
  return coupon;
}

export async function deleteCouponAdmin(id: string) {
  const res = await Coupon.deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new AppError(404, 'Coupon not found', 'NOT_FOUND');
  return { success: true };
}

export async function listAllOrdersAdmin(page = 1, limit = 20, status?: string) {
  const filter: any = {};
  if (status && status !== 'all') {
    if (status === 'refund_pending') {
      filter.paymentStatus = 'refund_pending';
    } else {
      filter.status = status;
    }
  }

  const [items, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email phone')
      .populate('restaurant', 'name slug emoji')
      .populate('partner', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return { items, total, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

/**
 * Open Edge Case: Refunds are only flagged for manual handling.
 * Resolves refund_pending orders, issues simulated/gateway refund, updates state and notifies customer.
 */
export async function processOrderRefund(orderId: string, adminId: string, reason = 'Admin processed refund') {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (order.paymentStatus !== 'refund_pending') {
    throw new AppError(409, `Order payment status is '${order.paymentStatus}', expected 'refund_pending'`, 'INVALID_STATUS');
  }

  const refundId = `ref_${crypto.randomBytes(8).toString('hex')}`;
  const amount = order.pricing?.total || 0;

  order.paymentStatus = 'refunded';
  order.refundDetails = {
    amount,
    refundId,
    refundedAt: new Date(),
    reason,
  };
  order.history.push({
    status: 'refunded',
    by: 'admin',
    at: new Date(),
  });

  await order.save();

  // Notify the user about the successful refund
  await createNotification(String(order.user), {
    title: 'Refund Processed',
    message: `Your refund of ₹${(amount / 100).toFixed(0)} for Order #${order.orderNumber} has been processed (Ref ID: ${refundId}).`,
    type: 'order',
    link: `/orders/${order._id}`,
  });

  emitOrderUpdate(order);
  return order;
}

/**
 * Open Edge Case: Stale unpaid orders are never cleaned up.
 * Finds online orders older than 15 minutes that were never paid, cancels them and releases coupon usage.
 */
export async function cleanupStaleOrders(staleMinutes = 15) {
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

  const staleOrders = await Order.find({
    paymentMethod: 'online',
    paymentStatus: 'unpaid',
    status: 'pending',
    createdAt: { $lt: cutoff },
  });

  let cleaned = 0;
  for (const order of staleOrders) {
    order.status = 'cancelled';
    order.history.push({
      status: 'cancelled',
      by: 'system',
      at: new Date(),
    });
    await order.save();

    // Release coupon usage if any
    if (order.couponCode) {
      await Coupon.updateOne(
        { code: order.couponCode },
        { $pull: { usedBy: order.user }, $inc: { usedCount: -1 } },
      );
    }

    emitOrderUpdate(order);
    cleaned++;
  }

  return { cleaned, timestamp: new Date() };
}

export async function updateAdminPlatformSettings(data: {
  deliveryFee?: number;
  freeDeliveryThreshold?: number;
  taxRatePercent?: number;
  commissionRatePercent?: number;
  deliveryPartnerBaseFee?: number;
  isMaintenanceMode?: boolean;
}) {
  let settings = await PlatformSettings.findOne();
  if (!settings) {
    settings = new PlatformSettings();
  }

  if (data.deliveryFee !== undefined) settings.deliveryFee = data.deliveryFee;
  if (data.freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = data.freeDeliveryThreshold;
  if (data.taxRatePercent !== undefined) settings.taxRatePercent = data.taxRatePercent;
  if (data.commissionRatePercent !== undefined) settings.commissionRatePercent = data.commissionRatePercent;
  if (data.deliveryPartnerBaseFee !== undefined) settings.deliveryPartnerBaseFee = data.deliveryPartnerBaseFee;
  if (data.isMaintenanceMode !== undefined) settings.isMaintenanceMode = data.isMaintenanceMode;

  await settings.save();
  return settings;
}
