import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  Check,
  CheckCircle2,
  Home,
  MapPin,
  Plus,
  Trash2,
  User as UserIcon,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState, Skeleton } from '../components/ui';
import { api, SavedAddress } from '../lib/api';
import { useAuth, User } from '../stores/auth';

export default function Profile() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api<{ user: User & { savedAddresses: SavedAddress[] } }>('/profile'),
  });

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialized, setInitialized] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  if (data?.user && !initialized) {
    setName(data.user.name || '');
    setPhone(data.user.phone || '');
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: () => api('/profile', {}, { method: 'PATCH', json: { name, phone } }),
    onSuccess: (res: any) => {
      useAuth.setState((st) => ({
        ...st,
        user: st.user ? { ...st.user, name: res.user.name, phone: res.user.phone } : null,
      }));
      qc.invalidateQueries({ queryKey: ['user-profile'] });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 3000);
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: (id: string) => api(`/profile/addresses/${id}`, {}, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-profile'] }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api(`/profile/addresses/${id}`, {}, { method: 'PATCH', json: { isDefault: true } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-profile'] }),
  });

  if (isLoading) return <Skeleton className="h-72" />;
  const u = data?.user;
  const addresses = u?.savedAddresses || [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account & Addresses</h1>
        <p className="text-sm text-muted">Manage your personal information and delivery addresses</p>
      </div>

      {savedNotice && (
        <div className="rounded-xl bg-green-50 p-3 text-xs font-semibold text-green-700 flex items-center gap-2">
          <CheckCircle2 className="size-4" /> Personal info updated!
        </div>
      )}

      {/* Personal Info Form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-card space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <UserIcon className="size-5 text-brand-600" /> Personal Details
        </h2>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate();
          }}
          className="grid gap-4 sm:grid-cols-2 text-xs font-semibold"
        >
          <div>
            <label className="block text-muted mb-1 uppercase">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-muted mb-1 uppercase">Email Address (Read-Only)</label>
            <input
              type="email"
              disabled
              value={u?.email || ''}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-100 p-2.5 text-sm font-normal text-muted outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-muted mb-1 uppercase">Phone Number</label>
            <input
              type="tel"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full sm:max-w-xs rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-600 shadow-sm disabled:opacity-50"
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>

      {/* Saved Addresses */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MapPin className="size-5 text-brand-600" /> Saved Delivery Addresses
          </h2>
          <button
            onClick={() => {
              setEditingAddress(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-600"
          >
            <Plus className="size-4" /> Add New Address
          </button>
        </div>

        {addresses.length === 0 ? (
          <EmptyState
            title="No addresses saved yet"
            hint="Add your home, work, or other addresses for faster checkout."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((a) => (
              <div key={a._id} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-card flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink uppercase tracking-wider">
                      {a.label === 'home' ? <Home className="size-4 text-brand-500" /> : a.label === 'work' ? <Briefcase className="size-4 text-blue-500" /> : <MapPin className="size-4 text-green-500" />}
                      {a.label}
                    </span>
                    {a.isDefault && (
                      <span className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[10px] font-bold">
                        Default Address
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-ink mt-2">{a.name}</h3>
                  <p className="text-xs text-muted mt-0.5">{a.line1}, {a.city} - {a.pincode}</p>
                  <p className="text-xs text-muted mt-1 font-medium">📞 {a.phone}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 mt-4 text-xs font-semibold">
                  {!a.isDefault ? (
                    <button
                      onClick={() => setDefaultMutation.mutate(a._id)}
                      className="text-brand-600 hover:underline"
                    >
                      Set as Default
                    </button>
                  ) : (
                    <span className="text-[11px] text-green-700 font-bold">✓ Default</span>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingAddress(a);
                        setModalOpen(true);
                      }}
                      className="text-muted hover:text-ink"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Delete this address?')) deleteAddressMutation.mutate(a._id);
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddressModal
          address={editingAddress}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['user-profile'] });
          }}
        />
      )}
    </div>
  );
}

function AddressModal({
  address,
  onClose,
  onSaved,
}: {
  address: SavedAddress | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState<'home' | 'work' | 'other'>(address?.label || 'home');
  const [name, setName] = useState(address?.name || '');
  const [phone, setPhone] = useState(address?.phone || '');
  const [line1, setLine1] = useState(address?.line1 || '');
  const [city, setCity] = useState(address?.city || '');
  const [pincode, setPincode] = useState(address?.pincode || '');
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) return setError('Enter a valid 10-digit mobile number');
    if (!/^\d{6}$/.test(pincode)) return setError('Enter a valid 6-digit pincode');

    setSaving(true);
    setError('');

    try {
      if (address) {
        await api(`/profile/addresses/${address._id}`, {}, {
          method: 'PATCH',
          json: { label, name, phone, line1, city, pincode, isDefault },
        });
      } else {
        await api('/profile/addresses', {}, {
          method: 'POST',
          json: { label, name, phone, line1, city, pincode, isDefault },
        });
      }
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to save address');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-extrabold text-lg">{address ? 'Edit Address' : 'Add New Address'}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface">
            <X className="size-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-muted mb-1 uppercase">Address Label</label>
            <div className="flex gap-2">
              {(['home', 'work', 'other'] as const).map((l) => (
                <button
                  type="button"
                  key={l}
                  onClick={() => setLabel(l)}
                  className={`flex-1 py-2 rounded-xl capitalize font-bold border transition ${
                    label === l ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-200 bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted mb-1 uppercase">Contact Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Receiver name"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-muted mb-1 uppercase">Phone Number</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-muted mb-1 uppercase">Address Line 1</label>
            <input
              type="text"
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              placeholder="Flat, building, street, landmark"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-muted mb-1 uppercase">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kochi"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-muted mb-1 uppercase">Pincode</label>
              <input
                type="text"
                required
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="e.g. 682001"
                className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="size-4 rounded text-brand-600" />
            <span>Make this my default delivery address</span>
          </label>

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
              {saving ? 'Saving...' : 'Save Address'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
