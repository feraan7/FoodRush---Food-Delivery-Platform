export const STATUSES = ['pending', 'confirmed', 'preparing', 'ready_for_pickup', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof STATUSES)[number];
export type Actor = 'customer' | 'restaurant' | 'delivery' | 'admin';

// One table decides who may move an order from which status to which.
const RULES: Record<OrderStatus, Partial<Record<OrderStatus, Actor[]>>> = {
  pending: { confirmed: ['restaurant', 'admin'], ready_for_pickup: ['restaurant', 'admin'], picked_up: ['delivery', 'admin'], cancelled: ['customer', 'restaurant', 'admin'] },
  confirmed: { preparing: ['restaurant', 'admin'], ready_for_pickup: ['restaurant', 'admin'], picked_up: ['delivery', 'admin'], cancelled: ['customer', 'restaurant', 'admin'] },
  preparing: { ready_for_pickup: ['restaurant', 'admin'], picked_up: ['delivery', 'admin'], cancelled: ['admin'] },
  ready_for_pickup: { picked_up: ['delivery', 'admin'], out_for_delivery: ['delivery', 'admin'], cancelled: ['admin'] },
  picked_up: { out_for_delivery: ['delivery', 'admin'], delivered: ['delivery', 'admin'] },
  out_for_delivery: { delivered: ['delivery', 'admin'] },
  delivered: {},
  cancelled: {},
};
export const canTransition = (from: OrderStatus, to: OrderStatus, actor: Actor) => !!RULES[from]?.[to]?.includes(actor);
