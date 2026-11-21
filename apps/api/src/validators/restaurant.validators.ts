import { z } from 'zod';

export const updateRestaurantProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    description: z.string().max(300).optional(),
    cuisines: z.array(z.string().trim()).optional(),
    deliveryMins: z.number().int().min(5).max(120).optional(),
    priceForTwo: z.number().int().min(0).optional(),
    isOpen: z.boolean().optional(),
    image: z.string().optional(),
  })
  .strict();

export const createFoodSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().max(300).optional(),
    price: z.number().int().min(1, 'Price must be positive in paise'),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID'),
    isVeg: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    image: z.string().optional(),
  })
  .strict();

export const updateFoodSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().max(300).optional(),
    price: z.number().int().min(1).optional(),
    category: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid category ID').optional(),
    isVeg: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    image: z.string().optional(),
  })
  .strict();

export const restaurantOrderStatusSchema = z
  .object({
    status: z.enum(['confirmed', 'preparing', 'ready_for_pickup', 'cancelled']),
  })
  .strict();
