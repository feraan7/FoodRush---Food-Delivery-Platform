import { create } from 'zustand';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'customer' | 'restaurant' | 'delivery' | 'admin';
  phone?: string;
  deliveryProfile?: {
    vehicleType?: string;
    vehicleNumber?: string;
    isAvailable: boolean;
    status: string;
    totalEarnings: number;
  };
  savedAddresses?: Array<{
    _id: string;
    label: 'home' | 'work' | 'other';
    name: string;
    phone: string;
    line1: string;
    city: string;
    pincode: string;
    isDefault: boolean;
  }>;
}

interface AuthState {
  user: User | null;
  token: string | null;
  ready: boolean;
  logout: () => void;
}

// The access token lives only in memory; the refresh token is an httpOnly cookie the page cannot read.
export const useAuth = create<AuthState>((set) => ({
  user: null,
  token: null,
  ready: false,
  logout: () => {
    fetch('/api/v1/auth/logout', { method: 'POST' }).finally(() => {
      set({ user: null, token: null });
    });
  },
}));
