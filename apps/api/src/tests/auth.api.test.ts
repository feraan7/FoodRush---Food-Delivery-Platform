import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';
import { User } from '../models/User';

let mongod: MongoMemoryReplSet;
const app = createApp();
const creds = { name: 'Asha Nair', email: 'asha@example.com', password: 'Passw0rdOK' };
const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[]).find((c) => c.startsWith('fr_refresh='))!;

beforeAll(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongod.getUri());
  await User.init();
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
beforeEach(async () => {
  await User.deleteMany({});
});

describe('auth API', () => {
  it('registers a customer, hides secrets, sets an httpOnly refresh cookie', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(creds);
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('customer');
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.sessions).toBeUndefined();
    expect(cookieOf(res)).toMatch(/HttpOnly/i);
    const stored = await User.findOne({ email: creds.email }).select('+passwordHash');
    expect(stored!.passwordHash).not.toContain(creds.password);
  });

  it('refuses to create an admin through sign-up', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ ...creds, role: 'admin' });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate emails with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const res = await request(app).post('/api/v1/auth/register').send(creds);
    expect(res.status).toBe(409);
  });

  it('logs in and reads /me with the access token; blocks without it', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const login = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });
    expect(login.status).toBe(200);
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    expect(me.body.user.email).toBe(creds.email);
    expect((await request(app).get('/api/v1/auth/me')).status).toBe(401);
  });

  it('gives the same error for wrong password and unknown email', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const a = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: 'WrongPass1' });
    const b = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass1' });
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(a.body.error.message).toBe(b.body.error.message);
  });

  it('is immune to NoSQL injection in login', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    const res = await request(app).post('/api/v1/auth/login').send({ email: { $ne: '' }, password: { $ne: '' } });
    expect(res.status).toBe(400);
  });

  it('locks the account after 5 failed attempts', async () => {
    await request(app).post('/api/v1/auth/register').send(creds);
    for (let i = 0; i < 5; i++) await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: 'WrongPass1' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: creds.email, password: creds.password });
    expect(res.status).toBe(429);
  });

  it('rotates refresh tokens and revokes everything on reuse', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(creds);
    const first = cookieOf(reg);
    const rotated = await request(app).post('/api/v1/auth/refresh').set('Cookie', first);
    expect(rotated.status).toBe(200);
    const second = cookieOf(rotated);
    // the old token is now spent: reuse must fail and kill the newer session too
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', first)).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', second)).status).toBe(401);
  });

  it('logout invalidates the refresh token', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send(creds);
    const cookie = cookieOf(reg);
    expect((await request(app).post('/api/v1/auth/logout').set('Cookie', cookie)).status).toBe(204);
    expect((await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie)).status).toBe(401);
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});
