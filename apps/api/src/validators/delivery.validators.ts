import { z } from 'zod';

export const registerDeliverySchema = z
  .object({
    vehicleType: z.enum(['bike', 'scooter', 'cycle', 'ev']).optional(),
    vehicleNumber: z.string().trim().min(2).max(20).optional(),
  })
  .strict();

export const toggleDutySchema = z
  .object({
    isAvailable: z.boolean(),
  })
  .strict();

export const deliveryOrderStatusSchema = z
  .object({
    status: z.enum(['picked_up', 'out_for_delivery', 'delivered']),
  })
  .strict();
