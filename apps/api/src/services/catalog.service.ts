import { z } from 'zod';
import { Food, FoodCategory, Restaurant } from '../models/Catalog';
import { AppError } from '../utils/AppError';
import { foodQuery, restaurantQuery } from '../validators/catalog.validators';

// Escape user text before using it in a regular expression.
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rx = (s: string) => new RegExp(esc(s), 'i');
const paged = <T>(items: T[], total: number, page: number, limit: number) => ({
  items,
  total,
  page,
  pages: Math.max(1, Math.ceil(total / limit)),
});
const approvedIds = () => Restaurant.find({ status: 'approved' }).distinct('_id');

export const listCategories = () => FoodCategory.find().sort({ name: 1 }).lean();

export async function listRestaurants(q: z.infer<typeof restaurantQuery>) {
  const filter: Record<string, unknown> = { status: 'approved' };
  if (q.q) filter.$or = [{ name: rx(q.q) }, { cuisines: rx(q.q) }];
  if (q.cuisine) filter.cuisines = new RegExp(`^${esc(q.cuisine)}$`, 'i');
  if (q.veg) filter.isVeg = true;
  if (q.open) filter.isOpen = true;
  const sort = { rating: { rating: -1, ratingCount: -1 }, time: { deliveryMins: 1 }, price: { priceForTwo: 1 } }[q.sort] as Record<string, 1 | -1>;
  const [items, total] = await Promise.all([
    Restaurant.find(filter).sort(sort).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Restaurant.countDocuments(filter),
  ]);
  return paged(items, total, q.page, q.limit);
}

export async function getRestaurantMenu(slug: string) {
  const restaurant = await Restaurant.findOne({ slug: slug.toLowerCase(), status: 'approved' }).lean();
  if (!restaurant) throw new AppError(404, 'Restaurant not found', 'NOT_FOUND');
  const foods = await Food.find({ restaurant: restaurant._id, isAvailable: true })
    .populate<{ category: { _id: unknown; name: string; emoji: string } }>('category', 'name slug emoji')
    .sort({ isBestseller: -1, name: 1 })
    .lean();
  const groups = new Map<string, { category: (typeof foods)[number]['category']; items: typeof foods }>();
  for (const f of foods) {
    const key = String(f.category._id);
    if (!groups.has(key)) groups.set(key, { category: f.category, items: [] });
    groups.get(key)!.items.push(f);
  }
  return { restaurant, menu: [...groups.values()].sort((a, b) => a.category.name.localeCompare(b.category.name)) };
}

export async function listFoods(q: z.infer<typeof foodQuery>) {
  const filter: Record<string, unknown> = { isAvailable: true, restaurant: { $in: await approvedIds() } };
  if (q.q) filter.name = rx(q.q);
  if (q.veg) filter.isVeg = true;
  if (q.bestseller) filter.isBestseller = true;
  if (q.category) {
    const cat = await FoodCategory.findOne({ slug: q.category.toLowerCase() }).lean();
    if (!cat) return paged([], 0, q.page, q.limit);
    filter.category = cat._id;
  }
  const [items, total] = await Promise.all([
    Food.find(filter)
      .populate('restaurant', 'name slug')
      .populate('category', 'name slug emoji')
      .sort({ isBestseller: -1, name: 1 })
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Food.countDocuments(filter),
  ]);
  return paged(items, total, q.page, q.limit);
}

export async function search(text: string) {
  const [restaurants, foods] = await Promise.all([
    listRestaurants(restaurantQuery.parse({ q: text, limit: '8' })),
    listFoods(foodQuery.parse({ q: text, limit: '12' })),
  ]);
  return { restaurants: restaurants.items, foods: foods.items };
}
