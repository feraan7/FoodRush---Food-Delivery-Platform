import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Restaurant } from '../models/Catalog';
import { Order } from '../models/Commerce';
import { User } from '../models/User';
import * as delSvc from '../services/delivery.service';

let mongod: MongoMemoryReplSet;
let partnerId: string;
let restaurantId: string;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Restaurant.init(), Order.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Restaurant.deleteMany({}), Order.deleteMany({})]);
  const user = await User.create({ name: 'Rider Dave', email: 'dave@rider.com', passwordHash: 'hash', role: 'customer' });
  partnerId = String(user._id);

  const rest = await Restaurant.create({
    name: 'Burger Joint',
    slug: 'burger-joint',
    status: 'approved',
  });
  restaurantId = String(rest._id);
});

describe('Phase 8: Delivery Partner Registration, Assignment and Earnings', () => {
  it('registers a customer as delivery partner and manages active duty status', async () => {
    const partner = await delSvc.registerDeliveryPartner(partnerId, {
      vehicleType: 'scooter',
      vehicleNumber: 'MH-01-AB-9999',
    });
    expect(partner.role).toBe('delivery');
    expect(partner.deliveryProfile?.vehicleType).toBe('scooter');
    expect(partner.deliveryProfile?.isAvailable).toBe(true);

    // Toggle duty offline
    const prof = await delSvc.toggleDutyStatus(partnerId, false);
    expect(prof.isAvailable).toBe(false);
  });

  it('allows partner to claim ready orders and progresses delivery to completion with earnings payout', async () => {
    // Register as delivery
    await delSvc.registerDeliveryPartner(partnerId, { vehicleType: 'bike', vehicleNumber: 'KA-05-1234' });

    const customer = await User.create({ name: 'Hungry Customer', email: 'hungry@example.com', passwordHash: 'hash' });

    // Order ready for pickup
    const order = await Order.create({
      orderNumber: 'FRDELIVERY01',
      user: customer._id,
      restaurant: restaurantId,
      paymentMethod: 'cod',
      paymentStatus: 'cod',
      status: 'ready_for_pickup',
      items: [{ name: 'Burger Combo', price: 25000, qty: 1 }],
      pricing: { subtotal: 25000, discount: 0, deliveryFee: 3000, tax: 1250, total: 29250 },
      history: [{ status: 'ready_for_pickup', by: 'restaurant' }],
    });

    // 1. Partner sees order in available pool
    const available = await delSvc.getAvailableOrdersForPickup();
    expect(available.length).toBe(1);
    expect(available[0]._id.toString()).toBe(order._id.toString());

    // 2. Partner accepts the assignment
    const accepted = await delSvc.acceptOrderAssignment(partnerId, String(order._id));
    expect(accepted?.partner?._id.toString()).toBe(partnerId);

    // 3. Partner marks picked up from kitchen (ready_for_pickup -> picked_up)
    const pickedUp = await delSvc.updateOrderStatusByDelivery(partnerId, String(order._id), 'picked_up');
    expect(pickedUp?.status).toBe('picked_up');

    // 4. Partner marks out for delivery (picked_up -> out_for_delivery)
    const outForDel = await delSvc.updateOrderStatusByDelivery(partnerId, String(order._id), 'out_for_delivery');
    expect(outForDel?.status).toBe('out_for_delivery');

    // 5. Partner marks delivered (out_for_delivery -> delivered)
    const delivered = await delSvc.updateOrderStatusByDelivery(partnerId, String(order._id), 'delivered');
    expect(delivered?.status).toBe('delivered');

    // 6. Delivery earnings credited to partner
    const earnings = await delSvc.getPartnerEarnings(partnerId);
    expect(earnings.totalDelivered).toBe(1);
    expect(earnings.totalEarnings).toBeGreaterThanOrEqual(3500); // Base fee credited
  });
});
