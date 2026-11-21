import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  BadgePercent,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  Plus,
  RefreshCw,
  RotateCcw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Store,
  Tag,
  Trash2,
  Truck,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { api, CouponItem, inr, Order, PlatformSettings, Restaurant } from '../lib/api';
import { useAuth } from '../stores/auth';

export default function AdminPanel() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'overview' | 'restaurants' | 'delivery' | 'coupons' | 'orders' | 'settings'>('overview');

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-3xl bg-white shadow-card border border-amber-200 p-8 text-center max-w-xl mx-auto my-8 space-y-5">
        <div className="size-16 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mx-auto">
          <ShieldAlert className="size-9" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-ink">Administrator Access Required</h2>
          <p className="mt-2 text-sm text-muted">
            The platform admin panel is protected. You are currently logged in as{' '}
            <span className="font-bold text-ink">{user?.name || user?.email}</span> ({user?.role}).
          </p>
        </div>

        <div className="rounded-2xl bg-amber-50/70 p-4 border border-amber-100 text-left text-xs font-mono space-y-1.5">
          <p className="font-semibold text-amber-900 font-sans text-xs">Sign in with the Platform Administrator account:</p>
          <p><strong>Email:</strong> admin@foodrush.com</p>
          <p><strong>Password:</strong> Password@123</p>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/login?next=/admin" className="rounded-full bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 transition">
            Sign in as Admin
          </Link>
          <Link to="/" className="rounded-full bg-surface px-5 py-2.5 text-sm font-semibold text-ink hover:bg-zinc-200 transition">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Platform Administration</h1>
          <p className="text-sm text-muted">Platform settings, partner approvals, coupon management and refund processing</p>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap bg-surface p-1 rounded-2xl border border-zinc-200 text-xs font-bold">
          <button
            onClick={() => setTab('overview')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'overview' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('restaurants')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'restaurants' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Restaurants
          </button>
          <button
            onClick={() => setTab('delivery')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'delivery' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Delivery Fleet
          </button>
          <button
            onClick={() => setTab('coupons')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'coupons' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Coupons
          </button>
          <button
            onClick={() => setTab('orders')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'orders' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Orders & Refunds
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`px-3 py-2 rounded-xl transition ${tab === 'settings' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            Platform Settings
          </button>
        </div>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'restaurants' && <RestaurantsTab />}
      {tab === 'delivery' && <DeliveryPartnersTab />}
      {tab === 'coupons' && <CouponsTab />}
      {tab === 'orders' && <OrdersRefundsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () =>
      api<{
        totalSales: number;
        totalOrders: number;
        deliveredOrdersCount: number;
        totalCommission: number;
        totalCustomers: number;
        totalRestaurants: number;
        pendingRestaurants: number;
        approvedRestaurants: number;
        totalDeliveryPartners: number;
        statusBreakdown: Record<string, number>;
        pendingRefundsCount: number;
      }>('/admin/stats'),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const stats = data!;

  return (
    <div className="space-y-6">
      {/* Pending refunds alert if any */}
      {stats.pendingRefundsCount > 0 && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-5 text-amber-600 shrink-0" />
            <p className="text-sm font-bold">
              There {stats.pendingRefundsCount === 1 ? 'is 1 order' : `are ${stats.pendingRefundsCount} orders`} awaiting manual refund processing.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-3 py-1 rounded-full">Action Required</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Gross Order Volume</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{inr(stats.totalSales)}</p>
          <p className="text-xs text-muted font-medium mt-1">{stats.deliveredOrdersCount} delivered orders</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Platform Commission</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-600">{inr(stats.totalCommission)}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">Platform take-rate revenue</p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Total Restaurants</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{stats.totalRestaurants}</p>
          <p className="text-xs text-muted font-medium mt-1">
            <span className="text-green-600 font-bold">{stats.approvedRestaurants} approved</span> · {stats.pendingRestaurants} pending
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Fleet & Customers</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{stats.totalDeliveryPartners}</p>
          <p className="text-xs text-muted font-medium mt-1">{stats.totalCustomers} customer accounts</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
        <h3 className="font-bold text-base">Platform Order Status Distribution</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(stats.statusBreakdown).map(([st, cnt]) => (
            <div key={st} className="bg-surface rounded-xl p-3 text-center border border-zinc-100">
              <span className="text-2xl font-extrabold text-ink">{cnt}</span>
              <p className="text-[11px] font-semibold text-muted capitalize mt-1">{st.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Live Orders View */}
      <LiveOrdersOverview />
    </div>
  );
}

function LiveOrdersOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', 'all'],
    queryFn: () => api<{ items: Order[]; total: number }>('/admin/orders', { limit: 5 }),
    refetchInterval: 5000,
  });

  const orders = data?.items || [];

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">Recent Live Orders ({data?.total ?? 0})</h3>
        <span className="text-xs text-muted font-medium">Auto-updates in real time</span>
      </div>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : orders.length === 0 ? (
        <p className="text-xs text-muted">No orders placed yet.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {orders.map((o) => (
            <div key={o._id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-ink">#{o.orderNumber}</span>
                <span className="text-muted ml-2">· {o.restaurant?.emoji || '🍽️'} {o.restaurant?.name || 'Restaurant'}</span>
                <p className="text-muted mt-0.5">
                  Customer: {o.user?.name || o.address?.name || 'Customer'} · Total: <strong>{inr(o.pricing?.total || 0)}</strong> ({o.paymentMethod.toUpperCase()})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full capitalize ${
                  o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                  o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                  o.status === 'ready_for_pickup' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'bg-amber-100 text-amber-700'
                }`}>
                  {o.status.replace(/_/g, ' ')}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  o.paymentStatus === 'refund_pending' ? 'bg-red-100 text-red-800 animate-pulse' :
                  o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'
                }`}>
                  {o.paymentStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-restaurants', filter],
    queryFn: () => api<{ restaurants: Restaurant[] }>('/admin/restaurants', { status: filter }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/admin/restaurants/${id}/status`, {}, { method: 'PATCH', json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-restaurants'] }),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const restaurants = data?.restaurants || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Restaurant Approvals ({restaurants.length})</h2>
        <div className="flex gap-2 text-xs font-semibold">
          {['all', 'pending', 'approved', 'suspended', 'rejected'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 capitalize transition ${filter === s ? 'bg-ink text-white font-bold' : 'bg-surface border border-zinc-200 text-muted hover:text-ink'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        {restaurants.map((r) => (
          <div key={r._id} className="p-4 sm:flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{r.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-ink">{r.name}</h3>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                    r.status === 'approved' ? 'bg-green-100 text-green-700' :
                    r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'suspended' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {r.status || 'approved'}
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">{r.cuisines.join(', ')} · Owner: {r.owner?.name || 'Assigned'} ({r.owner?.email || 'N/A'})</p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              {r.status !== 'approved' && (
                <button
                  onClick={() => updateStatus.mutate({ id: r._id, status: 'approved' })}
                  disabled={updateStatus.isPending}
                  className="rounded-xl bg-green-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                >
                  Approve
                </button>
              )}
              {r.status === 'approved' && (
                <button
                  onClick={() => updateStatus.mutate({ id: r._id, status: 'suspended' })}
                  disabled={updateStatus.isPending}
                  className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100"
                >
                  Suspend
                </button>
              )}
              {r.status !== 'rejected' && (
                <button
                  onClick={() => updateStatus.mutate({ id: r._id, status: 'rejected' })}
                  disabled={updateStatus.isPending}
                  className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                >
                  Reject
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryPartnersTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-delivery-partners'],
    queryFn: () => api<{ partners: any[] }>('/admin/delivery-partners'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/admin/delivery-partners/${id}/status`, {}, { method: 'PATCH', json: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-delivery-partners'] }),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const partners = data?.partners || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Delivery Partners ({partners.length})</h2>

      <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        {partners.map((p) => {
          const prof = p.deliveryProfile || {};
          return (
            <div key={p._id} className="p-4 sm:flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-orange-100 text-brand-600 grid place-items-center font-bold text-sm">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-ink">{p.name}</h3>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      prof.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {prof.status || 'pending'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      prof.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {prof.isAvailable ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {p.email} · {p.phone || 'No phone'} · Vehicle: {prof.vehicleType || 'Bike'} ({prof.vehicleNumber || 'N/A'})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 sm:mt-0">
                <span className="text-xs font-bold text-green-600 mr-2">Earned: {inr(prof.totalEarnings || 0)}</span>
                {prof.status !== 'approved' ? (
                  <button
                    onClick={() => updateStatus.mutate({ id: p._id, status: 'approved' })}
                    disabled={updateStatus.isPending}
                    className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700"
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    onClick={() => updateStatus.mutate({ id: p._id, status: 'rejected' })}
                    disabled={updateStatus.isPending}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CouponsTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: () => api<{ coupons: CouponItem[] }>('/admin/coupons'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/admin/coupons/${id}`, {}, { method: 'PATCH', json: { isActive } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/admin/coupons/${id}`, {}, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-coupons'] }),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const coupons = data?.coupons || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Platform Promo Coupons ({coupons.length})</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-600"
        >
          <Plus className="size-4" /> Create Coupon
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {coupons.map((c) => (
          <div key={c._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-extrabold text-base tracking-wider text-brand-600">{c.code}</span>
                <p className="text-xs text-muted mt-0.5">
                  {c.type === 'percent' ? `${c.value}% discount` : `Flat ₹${c.value / 100} off`}
                </p>
              </div>
              <button
                onClick={() => toggleMutation.mutate({ id: c._id, isActive: !c.isActive })}
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'}`}
              >
                {c.isActive ? 'Active' : 'Disabled'}
              </button>
            </div>

            <div className="text-[11px] text-muted space-y-1">
              <p>Min order: {inr(c.minOrder || 0)}</p>
              {c.maxDiscount && <p>Max discount: {inr(c.maxDiscount)}</p>}
              <p>Redeemed: {c.usedCount} times</p>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => {
                  if (confirm(`Delete coupon ${c.code}?`)) deleteMutation.mutate(c._id);
                }}
                className="text-red-500 hover:text-red-700 text-xs font-semibold flex items-center gap-1"
              >
                <Trash2 className="size-3.5" /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && <CreateCouponModal onClose={() => setModalOpen(false)} onSaved={() => setModalOpen(false)} />}
    </div>
  );
}

function CreateCouponModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [type, setType] = useState<'percent' | 'flat'>('percent');
  const [value, setValue] = useState('');
  const [minOrderRupees, setMinOrderRupees] = useState('');
  const [maxDiscountRupees, setMaxDiscountRupees] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const numVal = Number(value);
      const valPaise = type === 'flat' ? numVal * 100 : numVal;
      const minPaise = minOrderRupees ? Number(minOrderRupees) * 100 : 0;
      const maxPaise = maxDiscountRupees ? Number(maxDiscountRupees) * 100 : undefined;

      await api('/admin/coupons', {}, {
        method: 'POST',
        json: {
          code,
          type,
          value: valPaise,
          minOrder: minPaise,
          maxDiscount: maxPaise,
        },
      });

      qc.invalidateQueries({ queryKey: ['admin-coupons'] });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to create coupon');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-extrabold text-lg">Create New Coupon</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface">
            <X className="size-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-muted mb-1 uppercase">Promo Code</label>
            <input
              type="text"
              required
              placeholder="e.g. FESTIVE30"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none uppercase"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted mb-1 uppercase">Discount Type</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              >
                <option value="percent">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>
            <div>
              <label className="block text-muted mb-1 uppercase">Value ({type === 'percent' ? '%' : '₹'})</label>
              <input
                type="number"
                required
                min="1"
                placeholder={type === 'percent' ? '20' : '50'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted mb-1 uppercase">Min Order (₹)</label>
              <input
                type="number"
                placeholder="199"
                value={minOrderRupees}
                onChange={(e) => setMinOrderRupees(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-muted mb-1 uppercase">Max Cap (₹, percent only)</label>
              <input
                type="number"
                disabled={type === 'flat'}
                placeholder="100"
                value={maxDiscountRupees}
                onChange={(e) => setMaxDiscountRupees(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none disabled:bg-zinc-100"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-muted hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Handles Orders, Refund Processing (Open Edge Case 2), and Stale Orders Cleanup (Open Edge Case 1)
 */
function OrdersRefundsTab() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cleanupMessage, setCleanupMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: () => api<{ items: Order[]; total: number; page: number; pages: number }>('/admin/orders', { status: statusFilter }),
    refetchInterval: 5000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/orders/${id}/status`, {}, { method: 'PATCH', json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const refundMutation = useMutation({
    mutationFn: (orderId: string) =>
      api(`/admin/orders/${orderId}/refund`, {}, { method: 'POST', json: { reason: 'Customer requested cancellation refund' } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  const cleanupMutation = useMutation({
    mutationFn: () => api<{ cleaned: number; timestamp: string }>('/admin/orders/cleanup-stale', {}, { method: 'POST' }),
    onSuccess: (res) => {
      setCleanupMessage(`Cleaned up ${res.cleaned} stale unpaid order(s) successfully!`);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
      setTimeout(() => setCleanupMessage(''), 5000);
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const orders = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Platform Orders & Refund Processing ({data?.total ?? 0})</h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edge Case 1: Manual trigger for stale order cleanup */}
          <button
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
            className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-surface px-4 py-1.5 text-xs font-bold text-ink hover:bg-orange-50 hover:border-brand-500 transition"
            title="Clean up online unpaid orders older than 15 minutes"
          >
            <RotateCcw className="size-3.5" /> Clean Up Stale Orders
          </button>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
        {[
          'all',
          'pending',
          'confirmed',
          'preparing',
          'ready_for_pickup',
          'picked_up',
          'out_for_delivery',
          'delivered',
          'refund_pending',
          'cancelled',
        ].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`whitespace-nowrap rounded-full px-3.5 py-1.5 capitalize transition ${
              statusFilter === s ? 'bg-ink text-white font-bold' : 'bg-surface border border-zinc-200 text-muted hover:text-ink'
            }`}
          >
            {s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {cleanupMessage && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-3 text-xs font-semibold text-green-800">
          {cleanupMessage}
        </div>
      )}

      <div className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-card overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted">No orders matching this filter</div>
        ) : (
          orders.map((o) => (
            <div key={o._id} className="p-4 sm:flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-extrabold text-sm text-ink">#{o.orderNumber}</span>
                  <span className="text-xs text-muted">· {o.restaurant?.emoji || '🍽️'} {o.restaurant?.name || 'Restaurant'}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    o.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    o.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    o.status === 'ready_for_pickup' ? 'bg-indigo-100 text-indigo-700 font-extrabold' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {o.status.replace(/_/g, ' ')}
                  </span>

                  {/* Payment Status Tag */}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.paymentStatus === 'refund_pending' ? 'bg-red-100 text-red-800 animate-pulse font-extrabold' :
                    o.paymentStatus === 'refunded' ? 'bg-purple-100 text-purple-800' :
                    o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-700'
                  }`}>
                    Payment: {o.paymentStatus}
                  </span>
                </div>

                <p className="text-xs text-muted">
                  Customer: <strong>{o.user?.name || o.address?.name || 'Customer'}</strong> ({o.user?.email || o.address?.phone || ''}) · Total: <strong>{inr(o.pricing?.total || 0)}</strong> ({o.paymentMethod.toUpperCase()})
                </p>

                {o.partner && (
                  <p className="text-xs text-blue-700 font-semibold">
                    🛵 Driver: {o.partner.name} ({o.partner.phone || 'Fleet'})
                  </p>
                )}

                {o.refundDetails && (
                  <p className="text-[11px] font-semibold text-purple-700">
                    Refund ID: {o.refundDetails.refundId} (Refunded on {new Date(o.refundDetails.refundedAt).toLocaleString()})
                  </p>
                )}
              </div>

              {/* Action Buttons for Admin */}
              <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-2">
                {o.status === 'pending' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'confirmed' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 shadow-sm transition"
                  >
                    Confirm Order
                  </button>
                )}
                {o.status === 'confirmed' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'preparing' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-sm transition"
                  >
                    Start Cooking
                  </button>
                )}
                {o.status === 'preparing' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'ready_for_pickup' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition"
                  >
                    Mark Ready for Pickup
                  </button>
                )}
                {o.status === 'ready_for_pickup' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'picked_up' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 shadow-sm transition"
                  >
                    Confirm Driver Picked Up
                  </button>
                )}
                {o.status === 'picked_up' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'out_for_delivery' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
                  >
                    Send Out for Delivery
                  </button>
                )}
                {o.status === 'out_for_delivery' && (
                  <button
                    onClick={() => updateStatusMutation.mutate({ id: o._id, status: 'delivered' })}
                    disabled={updateStatusMutation.isPending}
                    className="rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 shadow-sm transition"
                  >
                    Mark Delivered
                  </button>
                )}

                {/* Edge Case 2: Process Refund Button */}
                {o.paymentStatus === 'refund_pending' && (
                  <button
                    onClick={() => {
                      if (confirm(`Process simulated refund of ${inr(o.pricing.total)} for order #${o.orderNumber}?`)) {
                        refundMutation.mutate(o._id);
                      }
                    }}
                    disabled={refundMutation.isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-red-700 shadow-sm"
                  >
                    <RotateCcw className="size-3.5" /> Process Refund ({inr(o.pricing.total)})
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-platform-settings'],
    queryFn: () => api<{ settings: PlatformSettings }>('/admin/settings'),
  });

  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState('30');
  const [freeThresholdRupees, setFreeThresholdRupees] = useState('499');
  const [taxPercent, setTaxPercent] = useState('5');
  const [commissionPercent, setCommissionPercent] = useState('15');
  const [partnerBaseRupees, setPartnerBaseRupees] = useState('35');
  const [maintenance, setMaintenance] = useState(false);
  const [saved, setSaved] = useState(false);

  useState(() => {
    if (data?.settings) {
      const s = data.settings;
      setDeliveryFeeRupees((s.deliveryFee / 100).toString());
      setFreeThresholdRupees((s.freeDeliveryThreshold / 100).toString());
      setTaxPercent(s.taxRatePercent.toString());
      setCommissionPercent(s.commissionRatePercent.toString());
      setPartnerBaseRupees((s.deliveryPartnerBaseFee / 100).toString());
      setMaintenance(s.isMaintenanceMode);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (json: any) => api('/admin/settings', {}, { method: 'PATCH', json }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-platform-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      deliveryFee: Math.round(Number(deliveryFeeRupees) * 100),
      freeDeliveryThreshold: Math.round(Number(freeThresholdRupees) * 100),
      taxRatePercent: Number(taxPercent),
      commissionRatePercent: Number(commissionPercent),
      deliveryPartnerBaseFee: Math.round(Number(partnerBaseRupees) * 100),
      isMaintenanceMode: maintenance,
    });
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-6">
      <div>
        <h2 className="text-xl font-bold">Platform Pricing & Operational Settings</h2>
        <p className="text-xs text-muted">Configures dynamic fees, GST tax calculation, restaurant commission, and rider payouts</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700">
          <CheckCircle className="size-4" /> Platform settings saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted mb-1 uppercase">Standard Delivery Fee (₹)</label>
            <input
              type="number"
              min="0"
              required
              value={deliveryFeeRupees}
              onChange={(e) => setDeliveryFeeRupees(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-muted mb-1 uppercase">Free Delivery Above (₹)</label>
            <input
              type="number"
              min="0"
              required
              value={freeThresholdRupees}
              onChange={(e) => setFreeThresholdRupees(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted mb-1 uppercase">GST / Food Tax Rate (%)</label>
            <input
              type="number"
              min="0"
              max="28"
              required
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-muted mb-1 uppercase">Platform Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="50"
              required
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-muted mb-1 uppercase">Delivery Partner Base Payout (₹ per drop)</label>
          <input
            type="number"
            min="0"
            required
            value={partnerBaseRupees}
            onChange={(e) => setPartnerBaseRupees(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-zinc-200">
          <div>
            <p className="font-bold text-sm text-ink">Maintenance Mode</p>
            <p className="text-[11px] text-muted">Temporarily disables checkout across platform for system maintenance</p>
          </div>
          <button
            type="button"
            onClick={() => setMaintenance(!maintenance)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${maintenance ? 'bg-red-600 text-white' : 'bg-zinc-300 text-zinc-700'}`}
          >
            {maintenance ? 'Enabled (Maintenance)' : 'Disabled (Live)'}
          </button>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 shadow-sm"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Platform Settings'}
        </button>
      </form>
    </div>
  );
}
