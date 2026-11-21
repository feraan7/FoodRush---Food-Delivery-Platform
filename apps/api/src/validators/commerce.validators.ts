import { z } from 'zod';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const addItemSchema = z.object({ foodId: objectId, qty: z.number().int().min(1).max(20).default(1), replace: z.boolean().optional() }).strict();
export const setQtySchema = z.object({ qty: z.number().int().min(0).max(20) }).strict();
export const cartQuery = z.object({ coupon: z.string().trim().max(30).optional() });
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) });

export const addressSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  line1: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit pincode'),
}).strict();

export const createOrderSchema = z.object({ address: addressSchema, paymentMethod: z.enum(['cod', 'online']), couponCode: z.string().trim().max(30).optional() }).strict();
export const verifyPaymentSchema = z.object({ gatewayPaymentId: z.string().min(3).max(100), signature: z.string().min(10).max(200) }).strict();
export const statusSchema = z.object({ status: z.enum(['confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled']) }).strict();
