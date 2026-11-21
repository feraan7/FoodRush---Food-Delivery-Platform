import jwt from 'jsonwebtoken';
import { describe, expect, it, vi } from 'vitest';
import { authorize } from '../middleware/auth';
import { clean } from '../middleware/sanitize';
import { signAccessToken, verifyAccessToken } from '../utils/tokens';
import { loginSchema, registerSchema } from '../validators/auth.validators';

const valid = { name: 'Asha Nair', email: ' Asha@Example.com ', password: 'Passw0rdOK' };

describe('validators', () => {
  it('normalises email and accepts a valid registration', () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success && r.data.email).toBe('asha@example.com');
  });
  it('rejects weak passwords', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'password' }).success).toBe(false);
  });
  it('rejects a client-supplied role (mass assignment)', () => {
    expect(registerSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
  });
  it('rejects NoSQL operator objects in login', () => {
    expect(loginSchema.safeParse({ email: { $ne: '' }, password: { $ne: '' } }).success).toBe(false);
  });
  it('validates Indian mobile numbers', () => {
    expect(registerSchema.safeParse({ ...valid, phone: '9876543210' }).success).toBe(true);
    expect(registerSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(false);
  });
});

describe('tokens', () => {
  it('round-trips an access token', () => {
    const p = verifyAccessToken(signAccessToken('u1', 'customer'));
    expect([p.sub, p.role]).toEqual(['u1', 'customer']);
  });
  it('rejects a token signed with another secret', () => {
    const bad = jwt.sign({ role: 'admin' }, 'x'.repeat(40), { subject: 'u1' });
    expect(() => verifyAccessToken(bad)).toThrow();
  });
  it('rejects unsigned (alg none) tokens', () => {
    const none = jwt.sign({ role: 'admin' }, '', { algorithm: 'none', subject: 'u1' });
    expect(() => verifyAccessToken(none)).toThrow();
  });
});

describe('authorize', () => {
  const run = (role: any) => {
    const next = vi.fn();
    authorize('admin')({ user: role && { id: '1', role } } as any, {} as any, next);
    return next.mock.calls[0][0];
  };
  it('allows a permitted role', () => expect(run('admin')).toBeUndefined());
  it('forbids other roles with 403', () => expect(run('customer').status).toBe(403));
  it('requires authentication with 401', () => expect(run(undefined).status).toBe(401));
});

describe('sanitize', () => {
  it('strips operator and dotted keys recursively', () => {
    const out = clean(JSON.parse('{"a":{"$gt":1,"b":2},"c.d":3,"__proto__":{"x":1}}'));
    expect(out).toEqual({ a: { b: 2 } });
  });
});
