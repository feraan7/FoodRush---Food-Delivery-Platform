import crypto from 'crypto';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export interface PaymentProvider {
  name: 'mock' | 'razorpay';
  publicKey?: string;
  createOrder(amountPaise: number, receipt: string): Promise<{ gatewayOrderId: string }>;
  verify(p: { gatewayOrderId: string; gatewayPaymentId: string; signature: string }): boolean;
}

export const hmacHex = (secret: string, data: string) => crypto.createHmac('sha256', secret).update(data).digest('hex');
export const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
// Razorpay signs "<order_id>|<payment_id>" with the key secret (HMAC-SHA256).
const payload = (o: string, p: string) => `${o}|${p}`;

export const makeMockProvider = (secret: string): PaymentProvider & { sign(o: string, p: string): string } => ({
  name: 'mock',
  async createOrder() {
    return { gatewayOrderId: `mock_order_${crypto.randomBytes(8).toString('hex')}` };
  },
  sign: (o, p) => hmacHex(secret, payload(o, p)),
  verify: ({ gatewayOrderId, gatewayPaymentId, signature }) => safeEqual(hmacHex(secret, payload(gatewayOrderId, gatewayPaymentId)), signature),
});

export const makeRazorpayProvider = (keyId: string, keySecret: string): PaymentProvider => ({
  name: 'razorpay',
  publicKey: keyId,
  async createOrder(amount, receipt) {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount, currency: 'INR', receipt }),
    });
    if (!res.ok) throw new AppError(502, 'Payment gateway error. Please try again.', 'GATEWAY_ERROR');
    return { gatewayOrderId: ((await res.json()) as { id: string }).id };
  },
  verify: ({ gatewayOrderId, gatewayPaymentId, signature }) => safeEqual(hmacHex(keySecret, payload(gatewayOrderId, gatewayPaymentId)), signature),
});

export const mockProvider = makeMockProvider(env.MOCK_PAYMENT_SECRET);
export const paymentProvider: PaymentProvider =
  env.PAYMENT_PROVIDER === 'razorpay' ? makeRazorpayProvider(env.RAZORPAY_KEY_ID!, env.RAZORPAY_KEY_SECRET!) : mockProvider;
