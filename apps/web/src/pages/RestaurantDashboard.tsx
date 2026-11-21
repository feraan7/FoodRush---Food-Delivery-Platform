import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Flame,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ShoppingBag,
  Store,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { ImageUpload } from '../components/ImageUpload';
import { EmptyState, ErrorState, Rating, Skeleton, Tile, VegDot } from '../components/ui';
import { api, Category, Food, inr, Order, Restaurant } from '../lib/api';
import { useAuth } from '../stores/auth';

export default function RestaurantDashboard() {
  const [tab, setTab] = useState<'orders' | 'menu' | 'analytics' | 'settings'>('orders');
  const { user, token } = useAuth();
  const qc = useQueryClient();

  // Socket updates for live orders
  useEffect(() => {
    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on('order:updated', () => {
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
      qc.invalidateQueries({ queryKey: ['restaurant-analytics'] });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, qc]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Restaurant Partner Dashboard</h1>
          <p className="text-sm text-muted">Manage your menu, accept live orders, track revenue and analytics</p>
        </div>
        <div className="flex bg-surface p-1 rounded-2xl border border-zinc-200 text-xs font-bold">
          <button
            onClick={() => setTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${tab === 'orders' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <ShoppingBag className="size-4" /> Live Orders
          </button>
          <button
            onClick={() => setTab('menu')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${tab === 'menu' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <UtensilsCrossed className="size-4" /> Menu Manager
          </button>
          <button
            onClick={() => setTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${tab === 'analytics' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <BarChart3 className="size-4" /> Analytics
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition ${tab === 'settings' ? 'bg-brand-500 text-white shadow-sm' : 'text-muted hover:text-ink'}`}
          >
            <Store className="size-4" /> Profile
          </button>
        </div>
      </div>

      {tab === 'orders' && <OrdersTab />}
      {tab === 'menu' && <MenuTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'settings' && <SettingsTab />}
    </div>
  );
}

function OrdersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'active' | 'pending' | 'preparing' | 'ready_for_pickup' | 'delivered' | 'cancelled'>('active');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['restaurant-orders', filter],
    queryFn: () => api<{ orders: Order[] }>('/restaurant/orders', { status: filter }),
    refetchInterval: 10_000,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api(`/restaurant/orders/${id}/status`, {}, { method: 'PATCH', json: { status } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-orders'] });
    },
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const orders = data?.orders || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {(['active', 'pending', 'preparing', 'ready_for_pickup', 'delivered', 'cancelled', 'all'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3.5 py-1.5 capitalize transition ${filter === s ? 'bg-ink text-white font-bold' : 'bg-surface border border-zinc-200 text-muted hover:text-ink'}`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="No orders in this state" hint="New orders will arrive here automatically in real time." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <div key={o._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-zinc-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">#{o.orderNumber}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${
                      o.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      o.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      o.status === 'preparing' ? 'bg-purple-100 text-purple-800' :
                      o.status === 'ready_for_pickup' ? 'bg-indigo-100 text-indigo-800' :
                      o.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {o.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {o.paymentMethod.toUpperCase()} ({o.paymentStatus})
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-extrabold text-base text-ink">{inr(o.pricing.total)}</span>
                  <p className="text-[11px] text-muted">{o.items.length} items</p>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-xs">
                {o.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-zinc-700">
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-ink">{item.qty}x</span> {item.name}
                    </span>
                    <span className="font-semibold text-muted">{inr(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Customer Info */}
              <div className="bg-surface rounded-xl p-3 text-xs text-muted flex justify-between items-center">
                <div>
                  <p className="font-semibold text-ink">{o.address?.name || 'Customer'}</p>
                  <p className="truncate max-w-xs">{o.address?.line1}, {o.address?.city}</p>
                </div>
                <span className="font-medium text-[11px]">{o.address?.phone}</span>
              </div>

              {/* Action Buttons based on status */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                {o.status === 'pending' && (
                  <>
                    <button
                      onClick={() => updateStatus.mutate({ id: o._id, status: 'confirmed' })}
                      disabled={updateStatus.isPending}
                      className="flex-1 rounded-xl bg-brand-500 py-2 text-xs font-bold text-white hover:bg-brand-600 shadow-sm"
                    >
                      Accept Order
                    </button>
                    <button
                      onClick={() => updateStatus.mutate({ id: o._id, status: 'cancelled' })}
                      disabled={updateStatus.isPending}
                      className="px-4 rounded-xl border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </>
                )}
                {o.status === 'confirmed' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: o._id, status: 'preparing' })}
                    disabled={updateStatus.isPending}
                    className="flex-1 rounded-xl bg-purple-600 py-2 text-xs font-bold text-white hover:bg-purple-700 shadow-sm"
                  >
                    Start Preparing Food
                  </button>
                )}
                {o.status === 'preparing' && (
                  <button
                    onClick={() => updateStatus.mutate({ id: o._id, status: 'ready_for_pickup' })}
                    disabled={updateStatus.isPending}
                    className="flex-1 rounded-xl bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 shadow-sm"
                  >
                    Food is Ready for Pickup
                  </button>
                )}
                {o.status === 'ready_for_pickup' && (
                  <div className="flex-1 py-1 text-center text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl">
                    Waiting for delivery partner pickup
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Food | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-menu-management'],
    queryFn: () => api<{ restaurant: Restaurant; items: Food[]; categories: Category[] }>('/restaurant/menu'),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api(`/restaurant/menu/${id}/toggle`, {}, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu-management'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api(`/restaurant/menu/${id}`, {}, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['restaurant-menu-management'] }),
  });

  if (isLoading) return <Skeleton className="h-64" />;
  const items = data?.items || [];
  const categories = data?.categories || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Menu Dishes ({items.length})</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-600"
        >
          <Plus className="size-4" /> Add New Dish
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item._id} className="flex gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-card transition">
            <Tile image={item.image} emoji={item.category.emoji} className="size-20 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <VegDot veg={item.isVeg} />
                    <span className="font-bold text-sm truncate">{item.name}</span>
                  </div>
                  <span className="font-extrabold text-sm text-brand-600">{inr(item.price)}</span>
                </div>
                <p className="text-[11px] text-muted line-clamp-1 mt-0.5">{item.description || item.category.name}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-2">
                <button
                  onClick={() => toggleMutation.mutate(item._id)}
                  className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full transition ${
                    item.isAvailable !== false ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'
                  }`}
                  title="Toggle In-Stock / Out-of-Stock"
                >
                  {item.isAvailable !== false ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                  {item.isAvailable !== false ? 'In Stock' : 'Unavailable'}
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setModalOpen(true);
                    }}
                    className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface text-xs font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${item.name}"?`)) deleteMutation.mutate(item._id);
                    }}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <DishModal
          item={editingItem}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['restaurant-menu-management'] });
          }}
        />
      )}
    </div>
  );
}

function DishModal({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: Food | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [description, setDescription] = useState(item?.description || '');
  const [priceRupees, setPriceRupees] = useState(item ? (item.price / 100).toString() : '');
  const [category, setCategory] = useState(item?.category?._id || categories[0]?._id || '');
  const [isVeg, setIsVeg] = useState(item ? item.isVeg : false);
  const [isBestseller, setIsBestseller] = useState(item ? item.isBestseller : false);
  const [image, setImage] = useState(item?.image || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pricePaise = Math.round(Number(priceRupees) * 100);
    if (!name.trim()) return setError('Please enter dish name');
    if (isNaN(pricePaise) || pricePaise <= 0) return setError('Please enter a valid price');
    if (!category) return setError('Please select a category');

    setSaving(true);
    setError('');

    try {
      if (item) {
        await api(`/restaurant/menu/${item._id}`, {}, {
          method: 'PATCH',
          json: { name, description, price: pricePaise, category, isVeg, isBestseller, image },
        });
      } else {
        await api('/restaurant/menu', {}, {
          method: 'POST',
          json: { name, description, price: pricePaise, category, isVeg, isBestseller, image },
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save dish');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-extrabold text-lg">{item ? 'Edit Dish' : 'Add New Dish'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface">
            <X className="size-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <ImageUpload value={image} onChange={setImage} label="Dish Photo (Cloudinary / File)" />

          <div>
            <label className="block text-muted mb-1 uppercase tracking-wider">Dish Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Butter Chicken Masala"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted mb-1 uppercase tracking-wider">Price (₹)</label>
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={priceRupees}
                onChange={(e) => setPriceRupees(e.target.value)}
                placeholder="e.g. 250"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-muted mb-1 uppercase tracking-wider">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.emoji} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-muted mb-1 uppercase tracking-wider">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ingredients, preparation style..."
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isVeg} onChange={(e) => setIsVeg(e.target.checked)} className="size-4 text-green-600 rounded" />
              <span>Vegetarian dish</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} className="size-4 text-brand-600 rounded" />
              <span>Mark as Bestseller</span>
            </label>
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
              {saving ? 'Saving...' : item ? 'Update Dish' : 'Create Dish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-analytics'],
    queryFn: () =>
      api<{
        totalRevenue: number;
        totalOrders: number;
        avgOrderValue: number;
        statusCounts: Record<string, number>;
        salesByDay: { date: string; revenue: number; orders: number }[];
        topDishes: { name: string; count: number; revenue: number }[];
      }>('/restaurant/analytics'),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const stats = data!;

  const maxDailyRevenue = Math.max(1, ...stats.salesByDay.map((d) => d.revenue));

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Gross Revenue</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{inr(stats.totalRevenue)}</p>
          <p className="text-xs text-green-600 font-semibold mt-1">From completed orders</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Total Orders</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{stats.totalOrders}</p>
          <p className="text-xs text-muted font-medium mt-1">{stats.statusCounts['delivered'] || 0} delivered</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card">
          <p className="text-xs font-bold text-muted uppercase">Avg Order Value</p>
          <p className="mt-2 text-3xl font-extrabold text-ink">{inr(stats.avgOrderValue)}</p>
          <p className="text-xs text-muted font-medium mt-1">Per transaction</p>
        </div>
      </div>

      {/* 7-Day Sales Trend Bar Chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
        <h3 className="font-bold text-base">Last 7 Days Sales Trend</h3>
        <div className="h-44 flex items-end gap-3 pt-6 border-b border-zinc-100">
          {stats.salesByDay.map((d, i) => {
            const heightPercent = Math.max(8, Math.round((d.revenue / maxDailyRevenue) * 100));
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-muted opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  {inr(d.revenue)}
                </div>
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full rounded-t-lg bg-linear-to-t from-brand-600 to-amber-400 transition-all group-hover:brightness-110"
                />
                <span className="text-[10px] font-semibold text-muted whitespace-nowrap">
                  {new Date(d.date).toLocaleDateString([], { weekday: 'short' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Dishes */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
        <h3 className="font-bold text-base">Top Selling Dishes</h3>
        {stats.topDishes.length === 0 ? (
          <p className="text-xs text-muted py-4">No dish sales data yet.</p>
        ) : (
          <div className="space-y-3">
            {stats.topDishes.map((dish, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface">
                <div className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-bold text-sm text-ink">{dish.name}</p>
                    <p className="text-xs text-muted">{dish.count} ordered</p>
                  </div>
                </div>
                <span className="font-extrabold text-sm text-brand-600">{inr(dish.revenue)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['restaurant-profile'],
    queryFn: () => api<{ restaurant: Restaurant }>('/restaurant/profile'),
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryMins, setDeliveryMins] = useState(30);
  const [priceForTwoRupees, setPriceForTwoRupees] = useState('500');
  const [isOpen, setIsOpen] = useState(true);
  const [image, setImage] = useState('');
  const [cuisines, setCuisines] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data?.restaurant) {
      const r = data.restaurant;
      setName(r.name || '');
      setDescription(r.description || '');
      setDeliveryMins(r.deliveryMins || 30);
      setPriceForTwoRupees((r.priceForTwo / 100).toString());
      setIsOpen(r.isOpen !== false);
      setImage(r.image || '');
      setCuisines(r.cuisines?.join(', ') || '');
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: (payload: any) => api('/restaurant/profile', {}, { method: 'PATCH', json: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  if (isLoading) return <Skeleton className="h-64" />;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      name,
      description,
      deliveryMins: Number(deliveryMins),
      priceForTwo: Math.round(Number(priceForTwoRupees) * 100),
      isOpen,
      image,
      cuisines: cuisines.split(',').map((s) => s.trim()).filter(Boolean),
    });
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-6">
      <div>
        <h2 className="text-xl font-bold">Restaurant Profile & Settings</h2>
        <p className="text-xs text-muted">Update your public restaurant page details and online status</p>
      </div>

      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700">
          <CheckCircle2 className="size-4" /> Profile updated successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs font-semibold">
        <ImageUpload value={image} onChange={setImage} label="Restaurant Banner Photo (Cloudinary / File)" />

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface border border-zinc-200">
          <div>
            <p className="font-bold text-sm text-ink">Online Status</p>
            <p className="text-[11px] text-muted">Toggle whether your kitchen is open to receive new customer orders</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition ${isOpen ? 'bg-green-600 text-white' : 'bg-zinc-300 text-zinc-700'}`}
          >
            {isOpen ? 'Open for Orders' : 'Temporarily Closed'}
          </button>
        </div>

        <div>
          <label className="block text-muted mb-1 uppercase">Restaurant Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-muted mb-1 uppercase">Description</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-muted mb-1 uppercase">Cuisines (comma separated)</label>
          <input
            type="text"
            value={cuisines}
            onChange={(e) => setCuisines(e.target.value)}
            placeholder="Biryani, South Indian, Kerala"
            className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-muted mb-1 uppercase">Avg Delivery Time (mins)</label>
            <input
              type="number"
              min="5"
              max="120"
              value={deliveryMins}
              onChange={(e) => setDeliveryMins(Number(e.target.value))}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-muted mb-1 uppercase">Price for Two (₹)</label>
            <input
              type="number"
              min="0"
              value={priceForTwoRupees}
              onChange={(e) => setPriceForTwoRupees(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-600 disabled:opacity-50 shadow-sm"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
        </button>
      </form>
    </div>
  );
}
