import * as svc from '../services/delivery.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const register = asyncHandler(async (req, res) => {
  res.json({ partner: await svc.registerDeliveryPartner(uid(req), req.body) });
});

export const getProfile = asyncHandler(async (req, res) => {
  res.json(await svc.getDeliveryProfile(uid(req)));
});

export const toggleDuty = asyncHandler(async (req, res) => {
  res.json({ deliveryProfile: await svc.toggleDutyStatus(uid(req), req.body.isAvailable) });
});

export const getAvailableOrders = asyncHandler(async (_req, res) => {
  res.json({ orders: await svc.getAvailableOrdersForPickup() });
});

export const acceptOrder = asyncHandler(async (req, res) => {
  res.json({ order: await svc.acceptOrderAssignment(uid(req), req.params.id) });
});

export const getActiveOrders = asyncHandler(async (req, res) => {
  res.json({ orders: await svc.getActiveOrdersForPartner(uid(req)) });
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  res.json({ order: await svc.updateOrderStatusByDelivery(uid(req), req.params.id, req.body.status) });
});

export const getEarnings = asyncHandler(async (req, res) => {
  res.json(await svc.getPartnerEarnings(uid(req)));
});
