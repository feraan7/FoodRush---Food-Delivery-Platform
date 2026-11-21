import { getPlatformSettings } from '../models/PlatformSettings';
import * as svc from '../services/admin.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const getStats = asyncHandler(async (_req, res) => {
  res.json(await svc.getAdminStats());
});

export const listRestaurants = asyncHandler(async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json({ restaurants: await svc.listRestaurantsAdmin(status) });
});

export const updateRestaurantStatus = asyncHandler(async (req, res) => {
  res.json({ restaurant: await svc.updateRestaurantStatus(req.params.id, req.body.status) });
});

export const listDeliveryPartners = asyncHandler(async (_req, res) => {
  res.json({ partners: await svc.listDeliveryPartnersAdmin() });
});

export const updateDeliveryPartnerStatus = asyncHandler(async (req, res) => {
  res.json({ partner: await svc.updateDeliveryPartnerStatus(req.params.id, req.body.status) });
});

export const listCoupons = asyncHandler(async (_req, res) => {
  res.json({ coupons: await svc.listCouponsAdmin() });
});

export const createCoupon = asyncHandler(async (req, res) => {
  res.status(201).json({ coupon: await svc.createCouponAdmin(req.body) });
});

export const updateCoupon = asyncHandler(async (req, res) => {
  res.json({ coupon: await svc.updateCouponAdmin(req.params.id, req.body) });
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  res.json(await svc.deleteCouponAdmin(req.params.id));
});

export const listOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  res.json(await svc.listAllOrdersAdmin(page, limit, status));
});

export const processRefund = asyncHandler(async (req, res) => {
  res.json({ order: await svc.processOrderRefund(req.params.id, uid(req), req.body.reason) });
});

export const cleanupStaleOrders = asyncHandler(async (req, res) => {
  const mins = Number(req.query.mins) || 15;
  res.json(await svc.cleanupStaleOrders(mins));
});

export const getSettings = asyncHandler(async (_req, res) => {
  res.json({ settings: await getPlatformSettings() });
});

export const updateSettings = asyncHandler(async (req, res) => {
  res.json({ settings: await svc.updateAdminPlatformSettings(req.body) });
});
