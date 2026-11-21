import { Schema, model, Types } from 'mongoose';
import { STATUSES } from '../services/orderState';

const ref = (to: string, extra: object = {}) => ({ type: Types.ObjectId, ref: to, ...extra });

export const Coupon = model(
  'Coupon',
  new Schema(
    {
      code: { type: String, required: true, unique: true, uppercase: true, trim: true },
      type: { type: String, enum: ['percent', 'flat'], required: true },
      value: { type: Number, required: true, min: 1 }, // percent, or paise for flat
      minOrder: { type: Number, default: 0 },
      maxDiscount: Number,
      validFrom: Date,
      validUntil: Date,
      usageLimit: Number,
      usedCount: { type: Number, default: 0 },
      usedBy: [ref('User')],
      isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
  ),
);

export const Cart = model(
  'Cart',
  new Schema(
    {
      user: ref('User', { required: true, unique: true }),
      restaurant: ref('Restaurant'),
      items: [{ _id: false, food: ref('Food', { required: true }), qty: { type: Number, min: 1, max: 20, required: true } }],
    },
    { timestamps: true },
  ),
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    user: ref('User', { required: true }),
    restaurant: ref('Restaurant', { required: true }),
    partner: ref('User'),
    items: [{ _id: false, food: ref('Food'), name: String, price: Number, qty: Number, isVeg: Boolean }], // snapshot at purchase time
    address: { name: String, phone: String, line1: String, city: String, pincode: String },
    pricing: { subtotal: Number, discount: Number, deliveryFee: Number, tax: Number, total: Number },
    couponCode: String,
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'cod', 'refund_pending', 'refunded'], default: 'unpaid' },
    status: { type: String, enum: STATUSES, default: 'pending', index: true },
    history: [{ _id: false, status: String, at: { type: Date, default: Date.now }, by: String }],
    idempotencyKey: String,
    refundDetails: {
      amount: Number,
      refundId: String,
      refundedAt: Date,
      reason: String,
    },
    deliveryEarnings: { type: Number, default: 0 },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
export const Order = model('Order', orderSchema);

const paymentSchema = new Schema(
  {
    order: ref('Order', { required: true, unique: true }),
    provider: { type: String, enum: ['mock', 'razorpay'], required: true },
    gatewayOrderId: { type: String, required: true },
    gatewayPaymentId: String,
    status: { type: String, enum: ['created', 'paid'], default: 'created' },
    amount: { type: Number, required: true }, // paise
  },
  { timestamps: true },
);
// A gateway payment id can settle only one payment, ever: this blocks duplicate processing.
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } });
export const Payment = model('Payment', paymentSchema);
