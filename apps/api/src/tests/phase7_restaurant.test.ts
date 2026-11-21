import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { Order } from '../models/Commerce';
import { User } from '../models/User';
import * as restSvc from '../services/restaurant.service';

let mongod: MongoMemoryReplSet;
let ownerId: string;
let categoryId: string;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Restaurant.init(), Food.init(), Order.init()]);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Restaurant.deleteMany({}), Food.deleteMany({}), FoodCategory.deleteMany({}), Order.deleteMany({})]);
  const user = await User.create({ name: 'Chef Mario', email: 'mario@kitchen.com', passwordHash: 'hash', role: 'restaurant' });
  ownerId = String(user._id);

  const cat = await FoodCategory.create({ name: 'Italian', slug: 'italian', emoji: '🍝' });
  categoryId = String(cat._id);

  await Restaurant.create({
    owner: user._id,
    name: 'Mario Trattoria',
    slug: 'mario-trattoria',
    status: 'approved',
    cuisines: ['Italian'],
    deliveryMins: 30,
    priceForTwo: 50000,
    isOpen: true,
  });
});

describe('Phase 7: Restaurant Dashboard & Menu Management', () => {
  it('allows owner to update restaurant profile including online toggle and Cloudinary banner', async () => {
    const updated = await restSvc.updateRestaurantProfile(ownerId, {
      description: 'Authentic handmade pasta',
      isOpen: false,
      image: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    });
    expect(updated.description).toBe('Authentic handmade pasta');
    expect(updated.isOpen).toBe(false);
    expect(updated.image).toBe('https://res.cloudinary.com/demo/image/upload/sample.jpg');
  });

  it('supports full food item lifecycle: create, toggle availability, edit, and delete', async () => {
    // 1. Create dish with image
    const item = await restSvc.createMenuItem(ownerId, {
      name: 'Penne Arrabiata',
      description: 'Spicy garlic tomato sauce',
      price: 28000,
      category: categoryId,
      isVeg: true,
      isBestseller: true,
      image: 'https://res.cloudinary.com/demo/image/upload/penne.jpg',
    });
    expect(item.name).toBe('Penne Arrabiata');
    expect(item.isAvailable).toBe(true);
    expect(item.image).toBe('https://res.cloudinary.com/demo/image/upload/penne.jpg');

    // 2. Toggle availability (mark out of stock)
    const toggled = await restSvc.toggleMenuItemAvailability(ownerId, String(item._id));
    expect(toggled.isAvailable).toBe(false);

    // 3. Edit dish
    const edited = await restSvc.updateMenuItem(ownerId, String(item._id), { price: 32000 });
    expect(edited.price).toBe(32000);

    // 4. Delete dish
    const delRes = await restSvc.deleteMenuItem(ownerId, String(item._id));
    expect(delRes.success).toBe(true);
    expect(await Food.countDocuments({ _id: item._id })).toBe(0);
  });

  it('allows restaurant to accept orders and advance food preparation steps', async () => {
    const rest = await Restaurant.findOne({ owner: ownerId });
    const customer = await User.create({ name: 'Diner', email: 'diner@example.com', passwordHash: 'hash', role: 'customer' });

    const order = await Order.create({
      orderNumber: 'FRTEST001',
      user: customer._id,
      restaurant: rest!._id,
      paymentMethod: 'cod',
      paymentStatus: 'cod',
      status: 'pending',
      items: [{ name: 'Pasta', price: 28000, qty: 1, isVeg: true }],
      pricing: { subtotal: 28000, discount: 0, deliveryFee: 3000, tax: 1400, total: 32400 },
      history: [{ status: 'pending', by: 'customer' }],
    });

    // Accept order (pending -> confirmed)
    const confirmed = await restSvc.updateOrderStatusByRestaurant(ownerId, String(order._id), 'confirmed');
    expect(confirmed.status).toBe('confirmed');

    // Start preparing (confirmed -> preparing)
    const preparing = await restSvc.updateOrderStatusByRestaurant(ownerId, String(order._id), 'preparing');
    expect(preparing.status).toBe('preparing');

    // Food ready (preparing -> ready_for_pickup)
    const ready = await restSvc.updateOrderStatusByRestaurant(ownerId, String(order._id), 'ready_for_pickup');
    expect(ready.status).toBe('ready_for_pickup');
  });

  it('computes accurate restaurant analytics and top dishes', async () => {
    const rest = await Restaurant.findOne({ owner: ownerId });
    const customer = await User.create({ name: 'Diner 2', email: 'diner2@example.com', passwordHash: 'hash', role: 'customer' });

    await Order.create({
      orderNumber: 'FRTEST002',
      user: customer._id,
      restaurant: rest!._id,
      paymentMethod: 'cod',
      paymentStatus: 'cod',
      status: 'delivered',
      items: [
        { name: 'Bruschetta', price: 15000, qty: 2, isVeg: true },
        { name: 'Tiramisu', price: 20000, qty: 1, isVeg: true },
      ],
      pricing: { subtotal: 50000, discount: 0, deliveryFee: 0, tax: 2500, total: 52500 },
      history: [{ status: 'delivered', by: 'delivery' }],
    });

    const analytics = await restSvc.getRestaurantAnalytics(ownerId);
    expect(analytics.totalOrders).toBe(1);
    expect(analytics.totalRevenue).toBe(50000);
    expect(analytics.avgOrderValue).toBe(50000);
    expect(analytics.topDishes[0].name).toBe('Bruschetta');
    expect(analytics.topDishes[0].count).toBe(2);
  });
});
