import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bike,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  MapPin,
  Navigation,
  Package,
  Phone,
  Power,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { api, inr, Order } from '../lib/api';
import { useAuth } from '../stores/auth';

export default function DeliveryPortal() {
  const { user, token } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<'available' | 'active' | 'earnings'>('available');

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['delivery-profile'],
    queryFn: () => api<{ deliveryProfile: any; user: any }>('/delivery/profile'),
    enabled: user?.role === 'delivery',
  });

  // Socket updates for newly ready orders
  useEffect(() => {
    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on('order:updated', () => {
      qc.invalidateQueries({ queryKey: ['delivery-available-orders'] });
      qc.invalidateQueries({ queryKey: ['delivery-active-orders'] });
      qc.invalidateQueries({ queryKey: ['delivery-earnings'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, qc]);

  const toggleDuty = useMutation({
    mutationFn: (isAvailable: boolean) => api('/delivery/duty', {}, { method: 'PATCH', json: { isAvailable } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-profile'] }),
  });

  if (profileLoading) return <Skeleton className="h-64" />;

  // If user is not yet a delivery partner, show quick registration
  if (user?.role !== 'delivery') {
    return <PartnerRegistration />;
  }

  const profile = profileData?.deliveryProfile;
  const isOnline = profile?.isAvailable;

  return (
    <div className="space-y-6">
      {/* Header & Duty Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight">Delivery Fleet Partner</h1>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
              isOnline ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'
            }`}>
              <span className={`size-2 rounded-full ${isOnline ? 'bg-green-600 animate-pulse' : 'bg-zinc-500'}`} />
              {isOnline ? 'Online (Ready for Orders)' : 'Offline (On Break)'}
            </span>
          </div>
          <p className="text-sm text-muted mt-1">Vehicle: {profile?.vehicleType || 'Bike'} ({profile?.vehicleNumber || 'Unregistered'})</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => toggleDuty.mutate(!isOnline)}
            disabled={toggleDuty.isPending}
            className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-bold transition shadow-sm ${
              isOnline ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Power className="size-4" /> {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface p-1 rounded-2xl border border-zinc-200 text-xs font-bold max-w-md">
        <button
          onClick={() => setTab('available')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition ${tab === 'available' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          <Compass className="size-4" /> Ready for Pickup
        </button>
        <button
          onClick={() => setTab('active')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition ${tab === 'active' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          <Navigation className="size-4" /> Active Runs
        </button>
        <button
          onClick={() => setTab('earnings')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition ${tab === 'earnings' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          <DollarSign className="size-4" /> Payouts & Stats
        </button>
      </div>

      {tab === 'available' && <AvailableOrdersTab isOnline={!!isOnline} />}
      {tab === 'active' && <ActiveOrdersTab />}
      {tab === 'earnings' && <EarningsTab />}
    </div>
  );
}

function AvailableOrdersTab({ isOnline }: { isOnline: boolean }) {
  const qc = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['delivery-available-orders'],
    queryFn: () => api<{ orders: Order[] }>('/delivery/orders/available'),
    refetchInterval: 5000,
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api(`/delivery/orders/${id}/accept`, {}, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-available-orders'] });
      qc.invalidateQueries({ queryKey: ['delivery-active-orders'] });
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Orders Awaiting Pickup ({orders.length})</h2>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {!isOnline && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-semibold text-amber-800 flex items-center gap-2">
          <span>You are currently offline. Toggle status to Online above to accept delivery jobs.</span>
        </div>
      )}

      {orders.length === 0 ? (
        <EmptyState title="No orders waiting for pickup" hint="When restaurants finish preparing dishes, they will pop up here instantly." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <div key={o._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-extrabold text-base">Order #{o.orderNumber}</span>
                  <p className="text-xs text-muted mt-0.5">Estimated payout: <strong className="text-brand-600">₹35.00</strong></p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                  o.status === 'ready_for_pickup' ? 'bg-indigo-100 text-indigo-800' :
                  o.status === 'preparing' ? 'bg-amber-100 text-amber-800' : 'bg-orange-100 text-brand-800'
                }`}>
                  {o.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 bg-surface p-3 rounded-xl">
                  <MapPin className="size-4 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-ink">Pickup: {o.restaurant.name}</p>
                    <p className="text-muted">{o.restaurant.emoji} Restaurant Kitchen</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-surface p-3 rounded-xl">
                  <Navigation className="size-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-ink">Delivery: {o.address?.name}</p>
                    <p className="text-muted truncate max-w-xs">{o.address?.line1}, {o.address?.city} ({o.address?.pincode})</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => acceptMutation.mutate(o._id)}
                disabled={!isOnline || acceptMutation.isPending}
                className="w-full rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-40 transition shadow-sm"
              >
                {acceptMutation.isPending ? 'Accepting...' : 'Accept Delivery Assignment'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveOrdersTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-active-orders'],
    queryFn: () => api<{ orders: Order[] }>('/delivery/orders/active'),
    refetchInterval: 5000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/delivery/orders/${id}/status`, {}, { method: 'PATCH', json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['delivery-active-orders'] });
      qc.invalidateQueries({ queryKey: ['delivery-earnings'] });
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Active Deliveries in Progress ({orders.length})</h2>

      {orders.length === 0 ? (
        <EmptyState title="No active deliveries" hint="Accept an order from the 'Ready for Pickup' tab to begin your run." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <div key={o._id} className="rounded-2xl border-2 border-brand-500 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                <div>
                  <span className="font-extrabold text-lg">#{o.orderNumber}</span>
                  <p className="text-xs text-muted">{o.items.length} items · Total value {inr(o.pricing.total)}</p>
                </div>
                <span className="rounded-full bg-orange-100 text-brand-700 px-3 py-1 text-xs font-bold capitalize">
                  {o.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Progress Milestones */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                <div className={`p-2 rounded-xl ${['ready_for_pickup', 'picked_up', 'out_for_delivery'].includes(o.status) ? 'bg-orange-100 text-brand-700' : 'bg-surface text-muted'}`}>
                  1. Assigned
                </div>
                <div className={`p-2 rounded-xl ${['picked_up', 'out_for_delivery'].includes(o.status) ? 'bg-orange-100 text-brand-700' : 'bg-surface text-muted'}`}>
                  2. Picked Up
                </div>
                <div className={`p-2 rounded-xl ${o.status === 'out_for_delivery' ? 'bg-orange-100 text-brand-700' : 'bg-surface text-muted'}`}>
                  3. Delivering
                </div>
              </div>

              {/* Addresses & Contacts */}
              <div className="space-y-2 text-xs">
                <div className="bg-surface p-3 rounded-xl space-y-1">
                  <p className="font-bold text-ink">🏪 Restaurant: {o.restaurant.name}</p>
                  <p className="text-muted">Show order #{o.orderNumber} to restaurant staff</p>
                </div>

                <div className="bg-surface p-3 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-ink">👤 Customer: {o.address?.name}</p>
                    <a href={`tel:${o.address?.phone}`} className="flex items-center gap-1 font-bold text-brand-600 hover:underline">
                      <Phone className="size-3" /> Call
                    </a>
                  </div>
                  <p className="text-muted">{o.address?.line1}, {o.address?.city}</p>
                </div>
              </div>

              {/* Status Advancement Action Buttons */}
              <div className="pt-2">
                {['pending', 'confirmed', 'preparing', 'ready_for_pickup'].includes(o.status) && (
                  <button
                    onClick={() => updateStatus.mutate({ id: o._id, status: 'picked_up' })}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-xl bg-purple-600 py-3 text-xs font-bold text-white hover:bg-purple-700 shadow-sm transition"
                  >
                    Confirm Food Picked Up from Restaurant
                  </button>
                )}
                {o.status === 'picked_up' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: o._id, status: 'out_for_delivery' })}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-xl bg-blue-600 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-sm"
                  >
                    Start Heading to Customer Address
                  </button>
                )}
                {o.status === 'out_for_delivery' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: o._id, status: 'delivered' })}
                    disabled={updateStatus.isPending}
                    className="w-full rounded-xl bg-green-600 py-3 text-xs font-bold text-white hover:bg-green-700 shadow-sm"
                  >
                    Confirm Delivered to Customer
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EarningsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['delivery-earnings'],
    queryFn: () =>
      api<{
        totalEarnings: number;
        totalDelivered: number;
        todayEarnings: number;
        todayDelivered: number;
        recentDeliveries: any[];
      }>('/delivery/earnings'),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const stats = data!;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Today's Earnings</p>
          <p className="mt-2 text-3xl font-extrabold text-green-600">{inr(stats.todayEarnings)}</p>
          <p className="text-xs text-muted font-medium mt-1">{stats.todayDelivered} trips completed today</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Total Lifetime Earnings</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{inr(stats.totalEarnings)}</p>
          <p className="text-xs text-muted font-medium mt-1">Direct deposit eligible</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Completed Deliveries</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{stats.totalDelivered}</p>
          <p className="text-xs text-muted font-medium mt-1">100% on-time completion</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
        <h3 className="font-bold text-base">Recent Delivery Earnings</h3>
        {stats.recentDeliveries.length === 0 ? (
          <p className="text-xs text-muted py-4">No completed deliveries yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100">
            {stats.recentDeliveries.map((d: any) => (
              <div key={d._id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-ink">Order #{d.orderNumber}</p>
                  <p className="text-muted">{d.restaurant?.name} · {new Date(d.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span className="font-extrabold text-sm text-green-600">+{inr(d.deliveryEarnings || 3500)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PartnerRegistration() {
  const qc = useQueryClient();
  const [vehicleType, setVehicleType] = useState<'bike' | 'scooter' | 'cycle' | 'ev'>('bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const registerMutation = useMutation({
    mutationFn: () => api('/delivery/register', {}, { method: 'POST', json: { vehicleType, vehicleNumber } }),
    onSuccess: (res: any) => {
      useAuth.setState((st) => ({
        ...st,
        user: st.user ? { ...st.user, role: 'delivery' } : null,
      }));
      qc.invalidateQueries({ queryKey: ['delivery-profile'] });
    },
    onError: (err: any) => setError(err?.message || 'Failed to register'),
  });

  return (
    <div className="max-w-xl mx-auto rounded-3xl border border-zinc-200 bg-white p-8 shadow-card space-y-6">
      <div className="text-center space-y-2">
        <div className="size-16 rounded-full bg-orange-100 text-brand-600 grid place-items-center mx-auto">
          <Bike className="size-8" />
        </div>
        <h2 className="text-2xl font-extrabold">Deliver with FoodRush</h2>
        <p className="text-sm text-muted">Join our flexible delivery partner fleet, earn competitive per-order payouts and daily bonuses.</p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          registerMutation.mutate();
        }}
        className="space-y-4 text-xs font-semibold"
      >
        <div>
          <label className="block text-muted mb-1 uppercase">Vehicle Type</label>
          <select
            value={vehicleType}
            onChange={(e: any) => setVehicleType(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 p-3 text-sm font-normal focus:border-brand-500 outline-none"
          >
            <option value="bike">Motorcycle / Bike</option>
            <option value="scooter">Scooter</option>
            <option value="ev">Electric Scooter / EV</option>
            <option value="cycle">Bicycle</option>
          </select>
        </div>

        <div>
          <label className="block text-muted mb-1 uppercase">Vehicle Registration Number</label>
          <input
            type="text"
            required
            placeholder="e.g. KL-07-AB-1234"
            value={vehicleNumber}
            onChange={(e) => setVehicleNumber(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 p-3 text-sm font-normal focus:border-brand-500 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white hover:bg-brand-600 shadow-md transition disabled:opacity-50"
        >
          {registerMutation.isPending ? 'Onboarding...' : 'Join as Delivery Partner'}
        </button>
      </form>
    </div>
  );
}
