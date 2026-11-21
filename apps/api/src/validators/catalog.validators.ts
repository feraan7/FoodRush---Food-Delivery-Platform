import { z } from 'zod';

const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
const page = z.coerce.number().int().min(1).max(1000).default(1);
const text = z.string().trim().max(60);

export const restaurantQuery = z.object({
  q: text.optional(),
  cuisine: text.optional(),
  veg: bool.optional(),
  open: bool.optional(),
  sort: z.enum(['rating', 'time', 'price']).default('rating'),
  page,
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const foodQuery = z.object({
  q: text.optional(),
  category: text.optional(),
  veg: bool.optional(),
  bestseller: bool.optional(),
  page,
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export const searchQuery = z.object({ q: z.string().trim().min(2).max(60) });
