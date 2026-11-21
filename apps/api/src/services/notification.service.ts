import { Notification } from '../models/Notification';
import { emitNotification } from '../sockets';

export async function createNotification(
  userId: string,
  data: {
    title: string;
    message: string;
    type?: 'order' | 'promo' | 'system';
    link?: string;
  },
) {
  const notif = await Notification.create({
    user: userId,
    title: data.title,
    message: data.message,
    type: data.type || 'order',
    link: data.link || '',
    isRead: false,
  });

  emitNotification(userId, notif);
  return notif;
}

export async function getNotifications(userId: string) {
  const [items, unreadCount] = await Promise.all([
    Notification.find({ user: userId }).sort({ createdAt: -1 }).limit(30).lean(),
    Notification.countDocuments({ user: userId, isRead: false }),
  ]);
  return { items, unreadCount };
}

export async function markNotificationAsRead(userId: string, id: string) {
  return Notification.findOneAndUpdate({ _id: id, user: userId }, { isRead: true }, { new: true });
}

export async function markAllNotificationsAsRead(userId: string) {
  await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  return { success: true };
}
