import * as svc from '../services/catalog.service';
import { asyncHandler } from '../utils/asyncHandler';
import { foodQuery, restaurantQuery, searchQuery } from '../validators/catalog.validators';

// Invalid query strings throw a ZodError, which the error handler turns into a 400.
export const categories = asyncHandler(async (_req, res) => res.json({ items: await svc.listCategories() }));
export const restaurants = asyncHandler(async (req, res) => res.json(await svc.listRestaurants(restaurantQuery.parse(req.query))));
export const restaurant = asyncHandler(async (req, res) => res.json(await svc.getRestaurantMenu(String(req.params.slug))));
export const foods = asyncHandler(async (req, res) => res.json(await svc.listFoods(foodQuery.parse(req.query))));
export const search = asyncHandler(async (req, res) => res.json(await svc.search(searchQuery.parse(req.query).q)));
