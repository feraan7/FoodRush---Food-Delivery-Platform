import * as svc from '../services/restaurant.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ restaurant: await svc.getRestaurantForOwner(uid(req)) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  res.json({ restaurant: await svc.updateRestaurantProfile(uid(req), req.body) });
});

export const getMenu = asyncHandler(async (req, res) => {
  res.json(await svc.getRestaurantMenu(uid(req)));
});

export const createFood = asyncHandler(async (req, res) => {
  res.status(201).json({ item: await svc.createMenuItem(uid(req), req.body) });
});

export const updateFood = asyncHandler(async (req, res) => {
  res.json({ item: await svc.updateMenuItem(uid(req), req.params.id, req.body) });
});

export const toggleFoodAvailability = asyncHandler(async (req, res) => {
  res.json({ item: await svc.toggleMenuItemAvailability(uid(req), req.params.id) });
});

export const deleteFood = asyncHandler(async (req, res) => {
  res.json(await svc.deleteMenuItem(uid(req), req.params.id));
});

export const getOrders = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ orders: await svc.getRestaurantOrders(uid(req), status) });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  res.json({ order: await svc.updateOrderStatusByRestaurant(uid(req), req.params.id, req.body.status) });
});

export const getAnalytics = asyncHandler(async (req, res) => {
  res.json(await svc.getRestaurantAnalytics(uid(req)));
});
