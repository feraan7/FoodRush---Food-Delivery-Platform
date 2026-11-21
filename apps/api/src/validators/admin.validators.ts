import { z } from 'zod';

export const restaurantStatusSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected', 'suspended']),
  })
  .strict();

export const deliveryPartnerStatusSchema = z
  .object({
    status: z.enum(['pending', 'approved', 'rejected']),
  })
  .strict();

export const createCouponSchema = z
  .object({
    code: z.string().trim().min(3).max(20),
    type: z.enum(['percent', 'flat']),
    value: z.number().int().min(1),
    minOrder: z.number().int().min(0).optional(),
    maxDiscount: z.number().int().min(1).optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    usageLimit: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateCouponSchema = z
  .object({
    type: z.enum(['percent', 'flat']).optional(),
    value: z.number().int().min(1).optional(),
    minOrder: z.number().int().min(0).optional(),
    maxDiscount: z.number().int().min(1).optional(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
    usageLimit: z.number().int().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const refundSchema = z
  .object({
    reason: z.string().trim().max(200).optional(),
  })
  .strict();

export const updateSettingsSchema = z
  .object({
    deliveryFee: z.number().int().min(0).optional(),
    freeDeliveryThreshold: z.number().int().min(0).optional(),
    taxRatePercent: z.number().min(0).max(100).optional(),
    commissionRatePercent: z.number().min(0).max(100).optional(),
    deliveryPartnerBaseFee: z.number().int().min(0).optional(),
    isMaintenanceMode: z.boolean().optional(),
  })
  .strict();
