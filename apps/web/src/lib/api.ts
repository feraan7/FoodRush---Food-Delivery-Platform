import { useAuth, User } from '../stores/auth';

export interface Category { _id: string; name: string; slug: string; emoji: string }
export interface Restaurant {
  _id: string; name: string; slug: string; description: string; cuisines: string[]; image?: string; emoji: string;
  rating: number; ratingCount: number; deliveryMins: number; priceForTwo: number; isOpen: boolean; isVeg: boolean;
  status?: 'pending' | 'approved' | 'rejected' | 'suspended';
  owner?: { _id: string; name: string; email: string; phone?: string };
}
export interface Food {
  _id: string; name: string; description: string; price: number; isVeg: boolean; isBestseller: boolean; isAvailable?: boolean;
  image?: string; category: Category; restaurant: Pick<Restaurant, '_id' | 'name' | 'slug'>;
}
export interface Page<T> { items: T[]; total: number; page: number; pages: number }

export interface Review {
  _id: string;
  user: { _id: string; name: string };
  restaurant: string;
  order: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: 'order' | 'promo' | 'system';
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface SavedAddress {
  _id: string;
  label: 'home' | 'work' | 'other';
  name: string;
  phone: string;
  line1: string;
  city: string;
  pincode: string;
  isDefault: boolean;
}

export interface PlatformSettings {
  deliveryFee: number;
  freeDeliveryThreshold: number;
  taxRatePercent: number;
  commissionRatePercent: number;
  deliveryPartnerBaseFee: number;
  isMaintenanceMode: boolean;
}

export interface CouponItem {
  _id: string;
  code: string;
  type: 'percent' | 'flat';
  value: number;
  minOrder?: number;
  maxDiscount?: number;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
}

type Params = Record<string, string | number | boolean | undefined>;

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string, public details?: Record<string, string[]>) { super(message); }
}

let refreshing: Promise<string | null> | null = null;
export function refreshSession(): Promise<string | null> {
  refreshing ??= fetch('/api/v1/auth/refresh', { method: 'POST' })
    .then(async (r) => {
      if (!r.ok) return null;
      const b = await r.json();
      useAuth.setState({ user: b.user, token: b.accessToken });
      return b.accessToken as string;
    })
    .catch(() => null)
    .finally(() => { refreshing = null; });
  return refreshing;
}

const send = (url: string, init: RequestInit & { json?: unknown }, token: string | null) =>
  fetch(url, {
    ...init,
    body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    headers: { ...(init.json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });

export async function api<T>(path: string, params: Params = {}, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') qs.set(k, String(v));
  const url = `/api/v1${path}${qs.size ? `?${qs}` : ''}`;
  let res = await send(url, init, useAuth.getState().token);
  // An expired access token is renewed once through the refresh cookie, then the call is retried.
  if (res.status === 401 && !path.startsWith('/auth/') && useAuth.getState().token) {
    const t = await refreshSession();
    if (t) res = await send(url, init, t);
    else useAuth.setState({ user: null, token: null });
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.error?.message ?? 'Something went wrong. Please try again.', res.status, body?.error?.code, body?.error?.details);
  return body as T;
}

export async function uploadImageApi(base64: string): Promise<{ url: string; publicId?: string }> {
  return api<{ url: string; publicId?: string }>('/upload', {}, {
    method: 'POST',
    json: { image: base64 },
  });
}

// Amounts are stored in paise; display as ₹ with Indian digit grouping.
export const inr = (paise: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(paise / 100);

export interface CartLine { foodId: string; name: string; price: number; isVeg: boolean; qty: number; available: boolean }
export interface Totals { subtotal: number; discount: number; deliveryFee: number; tax: number; total: number }
export interface Cart { restaurant: { name: string; slug: string } | null; items: CartLine[]; totals: Totals | null; coupon: string | null; count: number }
export interface Order {
  _id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod: 'cod' | 'online'; createdAt: string;
  items: { name: string; price: number; qty: number; isVeg: boolean }[]; pricing: Totals; couponCode?: string;
  restaurant: { name: string; slug: string; emoji: string }; history: { status: string; at: string; by: string }[];
  address: { name: string; phone: string; line1: string; city: string; pincode: string };
  partner?: { _id: string; name: string; phone?: string; deliveryProfile?: any };
  user?: { _id: string; name: string; email?: string; phone?: string };
  refundDetails?: { amount: number; refundId: string; refundedAt: string; reason?: string };
  reviewed?: boolean;
}
