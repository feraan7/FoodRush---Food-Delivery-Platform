import * as svc from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';

const uid = (req: any) => req.user!.id as string;

export const list = asyncHandler(async (req, res) => {
  res.json(await svc.getNotifications(uid(req)));
});

export const markRead = asyncHandler(async (req, res) => {
  res.json({ notification: await svc.markNotificationAsRead(uid(req), req.params.id) });
});

export const markAllRead = asyncHandler(async (req, res) => {
  res.json(await svc.markAllNotificationsAsRead(uid(req)));
});
