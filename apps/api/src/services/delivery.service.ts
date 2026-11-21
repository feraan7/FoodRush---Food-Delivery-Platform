import { Order } from '../models/Commerce';
import { getPlatformSettings } from '../models/PlatformSettings';
import { User } from '../models/User';
import { emitOrderUpdate } from '../sockets';
import { AppError } from '../utils/AppError';
import { updateStatus as commerceUpdateStatus } from './order.service';
import { OrderStatus } from './orderState';

export async function registerDeliveryPartner(
  userId: string,
  data: {
    vehicleType?: 'bike' | 'scooter' | 'cycle' | 'ev';
    vehicleNumber?: string;
  },
) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  user.role = 'delivery';
  user.deliveryProfile = {
    vehicleType: data.vehicleType || 'bike',
    vehicleNumber: data.vehicleNumber || '',
    isAvailable: true,
    status: 'approved',
    totalEarnings: user.deliveryProfile?.totalEarnings || 0,
  };

  await user.save();
  return user;
}

export async function getDeliveryProfile(userId: string) {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');
  return {
    deliveryProfile: user.deliveryProfile || {
      vehicleType: 'bike',
      vehicleNumber: '',
      isAvailable: false,
      status: 'pending',
      totalEarnings: 0,
    },
    user: { id: user._id, name: user.name, phone: user.phone, email: user.email },
  };
}

export async function toggleDutyStatus(userId: string, isAvailable: boolean) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found', 'NOT_FOUND');

  if (!user.deliveryProfile) {
    user.deliveryProfile = {
      vehicleType: 'bike',
      vehicleNumber: '',
      isAvailable,
      status: 'approved',
      totalEarnings: 0,
    };
  } else {
    user.deliveryProfile.isAvailable = isAvailable;
  }

  await user.save();
  return user.deliveryProfile;
}

export async function getAvailableOrdersForPickup() {
  // Orders awaiting a delivery partner (unassigned active orders)
  return Order.find({
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup'] },
    $or: [{ partner: { $exists: false } }, { partner: null }],
  })
    .populate('restaurant', 'name slug emoji cuisines')
    .sort({ createdAt: -1 })
    .lean();
}

export async function acceptOrderAssignment(userId: string, orderId: string) {
  const order = await Order.findById(orderId);
  if (!order) throw new AppError(404, 'Order not found', 'NOT_FOUND');
  if (!['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(order.status)) {
    throw new AppError(409, `Order cannot be claimed in status '${order.status}'`, 'ORDER_NOT_AVAILABLE');
  }
  if (order.partner && String(order.partner) !== userId) {
    throw new AppError(409, 'Order has already been assigned to another partner', 'ALREADY_ASSIGNED');
  }

  order.partner = userId as any;
  await order.save();

  const populated = await Order.findById(order._id)
    .populate('restaurant', 'name slug emoji cuisines')
    .populate('user', 'name phone')
    .lean();

  if (populated) emitOrderUpdate(populated);
  return populated;
}

export async function getActiveOrdersForPartner(userId: string) {
  return Order.find({
    partner: userId,
    status: { $in: ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery'] },
  })
    .populate('restaurant', 'name slug emoji cuisines')
    .populate('user', 'name phone')
    .sort({ createdAt: -1 })
    .lean();
}

export async function updateOrderStatusByDelivery(userId: string, orderId: string, toStatus: OrderStatus) {
  const order = await Order.findOne({ _id: orderId, partner: userId });
  if (!order) throw new AppError(404, 'Order not found or not assigned to you', 'NOT_FOUND');

  const updated = await commerceUpdateStatus({ id: userId, role: 'delivery' }, orderId, toStatus);

  // If delivered, credit earnings to the delivery partner
  if (toStatus === 'delivered') {
    const settings = await getPlatformSettings();
    const earningsAmount = settings.deliveryPartnerBaseFee || 3500; // default ₹35

    await Order.updateOne({ _id: orderId }, { $set: { deliveryEarnings: earningsAmount } });
    await User.updateOne({ _id: userId }, { $inc: { 'deliveryProfile.totalEarnings': earningsAmount } });
  }

  return updated;
}

export async function getPartnerEarnings(userId: string) {
  const user = await User.findById(userId).lean();
  const deliveredOrders = await Order.find({
    partner: userId,
    status: 'delivered',
  })
    .populate('restaurant', 'name slug')
    .sort({ updatedAt: -1 })
    .lean();

  const totalDelivered = deliveredOrders.length;
  const totalEarnings = user?.deliveryProfile?.totalEarnings || deliveredOrders.reduce((sum, o) => sum + (o.deliveryEarnings || 3500), 0);

  // Today's earnings
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayOrders = deliveredOrders.filter(
    (o) => (o as any).updatedAt && new Date((o as any).updatedAt).toISOString().slice(0, 10) === todayStr,
  );
  const todayEarnings = todayOrders.reduce((sum, o) => sum + (o.deliveryEarnings || 3500), 0);

  return {
    totalEarnings,
    totalDelivered,
    todayEarnings,
    todayDelivered: todayOrders.length,
    recentDeliveries: deliveredOrders.slice(0, 20),
  };
}
