import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { Coupon, Order } from '../models/Commerce';
import { User } from '../models/User';

let mongod: MongoMemoryReplSet;
const app = createApp();
const address = { name: 'Asha Nair', phone: '9876543210', line1: '12 MG Road', city: 'Kochi', pincode: '682001' };
let foodId: string;

async function signup(email: string) {
  const r = await request(app).post('/api/v1/auth/register').send({ name: 'Test User', email, password: 'Passw0rdOK' });
  return r.body.accessToken as string;
}
const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await Promise.all([User.init(), Order.init()]);
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Order.deleteMany({}), Food.deleteMany({}), Restaurant.deleteMany({}), FoodCategory.deleteMany({}), Coupon.deleteMany({})]);
  const cat = await FoodCategory.create({ name: 'Biryani', slug: 'biryani' });
  const rest = await Restaurant.create({ name: 'Test Kitchen', slug: 'test-kitchen', status: 'approved', isOpen: true });
  const food = await Food.create({ restaurant: rest._id, category: cat._id, name: 'Biryani', price: 20000 });
  foodId = String(food._id);
  await Coupon.create({ code: 'FLAT50', type: 'flat', value: 5000, minOrder: 10000 });
});

describe('cart and orders', () => {
  it('requires login for the cart', async () => {
    expect((await request(app).get('/api/v1/cart')).status).toBe(401);
  });

  it('recomputes totals on the server and places a COD order idempotently', async () => {
    const t = await signup('a@example.com');
    await request(app).post('/api/v1/cart/items').set(auth(t)).send({ foodId, qty: 2 });
    const key = 'idem-key-12345';
    const body = { address, paymentMethod: 'cod', couponCode: 'flat50' };
    const a = await request(app).post('/api/v1/orders').set(auth(t)).set('Idempotency-Key', key).send(body);
    const b = await request(app).post('/api/v1/orders').set(auth(t)).set('Idempotency-Key', key).send(body);
    expect(a.status).toBe(201);
    expect(a.body.order.pricing).toMatchObject({ subtotal: 40000, discount: 5000, deliveryFee: 3000, tax: 1750, total: 39750 });
    expect(b.body.order._id).toBe(a.body.order._id);
    expect(await Order.countDocuments()).toBe(1);
    expect((await request(app).get('/api/v1/cart').set(auth(t))).body.count).toBe(0);
  });

  it('rejects a coupon used twice by the same customer', async () => {
    const t = await signup('b@example.com');
    for (let i = 0; i < 2; i++) {
      await request(app).post('/api/v1/cart/items').set(auth(t)).send({ foodId, qty: 1 });
      const r = await request(app).post('/api/v1/orders').set(auth(t)).send({ address, paymentMethod: 'cod', couponCode: 'FLAT50' });
      expect(r.status).toBe(i === 0 ? 201 : 400);
    }
  });

  it('settles an online payment once, and refuses forged or reused payments', async () => {
    const t = await signup('c@example.com');
    await request(app).post('/api/v1/cart/items').set(auth(t)).send({ foodId, qty: 1 });
    const placed = await request(app).post('/api/v1/orders').set(auth(t)).send({ address, paymentMethod: 'online' });
    const id = placed.body.order._id;
    expect(placed.body.order.paymentStatus).toBe('unpaid');

    const forged = await request(app).post(`/api/v1/orders/${id}/payment/verify`).set(auth(t)).send({ gatewayPaymentId: 'pay_fake', signature: 'f'.repeat(64) });
    expect(forged.status).toBe(400);

    const pay = (await request(app).post(`/api/v1/orders/${id}/payment/mock-pay`).set(auth(t))).body;
    const ok = await request(app).post(`/api/v1/orders/${id}/payment/verify`).set(auth(t)).send(pay);
    expect(ok.body.order.paymentStatus).toBe('paid');
    const again = await request(app).post(`/api/v1/orders/${id}/payment/verify`).set(auth(t)).send(pay);
    expect(again.status).toBe(200); // idempotent, not applied twice
  });

  it("hides other customers' orders and blocks status changes by customers", async () => {
    const owner = await signup('d@example.com');
    const other = await signup('e@example.com');
    await request(app).post('/api/v1/cart/items').set(auth(owner)).send({ foodId, qty: 1 });
    const id = (await request(app).post('/api/v1/orders').set(auth(owner)).send({ address, paymentMethod: 'cod' })).body.order._id;
    expect((await request(app).get(`/api/v1/orders/${id}`).set(auth(other))).status).toBe(404);
    expect((await request(app).patch(`/api/v1/orders/${id}/status`).set(auth(owner)).send({ status: 'confirmed' })).status).toBe(409);
    expect((await request(app).patch(`/api/v1/orders/${id}/status`).set(auth(owner)).send({ status: 'cancelled' })).status).toBe(200);
  });

  it('refuses to mix restaurants in one cart', async () => {
    const t = await signup('f@example.com');
    const other = await Restaurant.create({ name: 'Other', slug: 'other', status: 'approved' });
    const cat = await FoodCategory.findOne();
    const f2 = await Food.create({ restaurant: other._id, category: cat!._id, name: 'Dosa', price: 9000 });
    await request(app).post('/api/v1/cart/items').set(auth(t)).send({ foodId, qty: 1 });
    const r = await request(app).post('/api/v1/cart/items').set(auth(t)).send({ foodId: String(f2._id), qty: 1 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe('CART_CONFLICT');
  });
});
