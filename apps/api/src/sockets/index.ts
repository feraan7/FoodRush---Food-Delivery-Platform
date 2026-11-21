import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { Order } from '../models/Commerce';
import { Restaurant } from '../models/Catalog';
import { verifyAccessToken } from '../utils/tokens';

let io: Server | undefined;

export function initSockets(http: HttpServer) {
  io = new Server(http, { cors: { origin: env.origins, credentials: true } });

  // Every connection must present a valid access token.
  io.use((socket, next) => {
    try {
      const p = verifyAccessToken(String(socket.handshake.auth?.token ?? ''));
      socket.data.user = { id: p.sub as string, role: p.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id, role } = socket.data.user as { id: string; role: string };
    socket.join(`user:${id}`);
    if (role === 'admin') socket.join('admin');
    if (role === 'restaurant') for (const r of await Restaurant.find({ owner: id }).select('_id').lean()) socket.join(`restaurant:${r._id}`);

    // Joining a single order's room is allowed only for people involved in that order.
    socket.on('order:join', async (orderId: string, ack?: (ok: boolean) => void) => {
      try {
        const o = await Order.findById(orderId).select('user restaurant partner').lean();
        let allowed = !!o && (role === 'admin' || String(o.user) === id || String(o.partner) === id);
        if (!allowed && o && role === 'restaurant') allowed = !!(await Restaurant.exists({ _id: o.restaurant, owner: id }));
        if (allowed) socket.join(`order:${orderId}`);
        ack?.(allowed);
      } catch {
        ack?.(false);
      }
    });
  });
  return io;
}

interface OrderLike { _id: unknown; orderNumber: string; status?: string | null; paymentStatus?: string | null; user?: unknown; restaurant?: unknown; history?: unknown }

export function emitOrderUpdate(o: OrderLike) {
  io?.to([`order:${o._id}`, `user:${o.user}`, `restaurant:${o.restaurant}`, 'admin']).emit('order:updated', {
    orderId: String(o._id), orderNumber: o.orderNumber, status: o.status, paymentStatus: o.paymentStatus, history: o.history,
  });
}

export function emitNotification(userId: string, notification: any) {
  io?.to(`user:${userId}`).emit('notification:new', notification);
}

