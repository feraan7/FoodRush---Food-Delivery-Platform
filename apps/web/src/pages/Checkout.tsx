import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { EmptyState, Skeleton } from '../components/ui';
import { api, ApiError, Order, SavedAddress } from '../lib/api';
import { useCart } from '../lib/queries';
import { User } from '../stores/auth';
import { TotalsTable } from './Cart';

interface Placed {
  order: Order;
  payment: null | { provider: 'mock' | 'razorpay'; gatewayOrderId: string; amount: number; publicKey?: string };
}
const input =
  'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

function loadRazorpay(): Promise<boolean> {
  if ((window as any).Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const [sp] = useSearchParams();
  const coupon = sp.get('coupon') ?? undefined;
  const cart = useCart(coupon);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const idemKey = useRef(crypto.randomUUID()); // a double-click or retry returns the same order
  const [method, setMethod] = useState<'cod' | 'online'>('cod');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  // Address inputs state
  const [selectedAddressId, setSelectedAddressId] = useState<string>('custom');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Fetch saved addresses from profile
  const { data: profileData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api<{ user: User & { savedAddresses: SavedAddress[] } }>('/profile'),
  });

  const savedAddresses = profileData?.user?.savedAddresses || [];

  function pickSavedAddress(addr: SavedAddress) {
    setSelectedAddressId(addr._id);
    setName(addr.name);
    setPhone(addr.phone);
    setLine1(addr.line1);
    setCity(addr.city);
    setPincode(addr.pincode);
  }

  // Auto-select default address on first load
  useState(() => {
    if (savedAddresses.length > 0 && selectedAddressId === 'custom') {
      const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      pickSavedAddress(def);
    }
  });

  async function verify(orderId: string, gatewayPaymentId: string, signature: string) {
    await api(`/orders/${orderId}/payment/verify`, {}, { method: 'POST', json: { gatewayPaymentId, signature } });
    await qc.invalidateQueries({ queryKey: ['cart'] });
    navigate(`/orders/${orderId}`, { replace: true });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setFields({});
    const address = { name, phone, line1, city, pincode };
    try {
      const placed = await api<Placed>(
        '/orders',
        {},
        {
          method: 'POST',
          json: { address, paymentMethod: method, couponCode: coupon },
          headers: { 'Idempotency-Key': idemKey.current },
        },
      );
      const { order, payment } = placed;
      if (!payment) {
        await qc.invalidateQueries({ queryKey: ['cart'] });
        return navigate(`/orders/${order._id}`, { replace: true });
      }

      if (payment.provider === 'mock') {
        const p = await api<{ gatewayPaymentId: string; signature: string }>(
          `/orders/${order._id}/payment/mock-pay`,
          {},
          { method: 'POST' },
        );
        return await verify(order._id, p.gatewayPaymentId, p.signature);
      }
      if (!(await loadRazorpay()))
        throw new Error('Could not load the payment window. Check your connection and try again.');
      const rz = new (window as any).Razorpay({
        key: payment.publicKey,
        amount: payment.amount,
        currency: 'INR',
        order_id: payment.gatewayOrderId,
        name: 'FoodRush',
        prefill: { name: address.name, contact: address.phone },
        theme: { color: '#F97316' },
        handler: (r: any) => verify(order._id, r.razorpay_payment_id, r.razorpay_signature).catch((er) => setError(er.message)),
        modal: { ondismiss: () => setBusy(false) },
      });
      rz.on('payment.failed', () => {
        setError('Payment failed. You can try again.');
        setBusy(false);
      });
      rz.open();
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      if (err instanceof ApiError) setFields(err.details ?? {});
    }
    setBusy(false);
  }

  if (cart.isLoading) return <Skeleton className="h-64" />;
  if (!cart.data?.items.length) {
    return (
      <EmptyState
        title="Nothing to check out"
        action={
          <Link to="/restaurants" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
            Browse restaurants
          </Link>
        }
      />
    );
  }

  const fe = (k: string) => fields[k]?.[0] && <p className="mt-1 text-xs text-red-600">{fields[k][0]}</p>;

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_22rem]" noValidate>
      <section className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>

        {/* Saved Addresses Selector */}
        {savedAddresses.length > 0 && (
          <div className="rounded-card bg-white p-5 shadow-card space-y-3">
            <h2 className="text-sm font-bold text-ink">Choose Saved Address</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {savedAddresses.map((a) => (
                <button
                  type="button"
                  key={a._id}
                  onClick={() => pickSavedAddress(a)}
                  className={`text-left p-3 rounded-xl border text-xs transition ${
                    selectedAddressId === a._id
                      ? 'border-brand-500 bg-orange-50/60 ring-2 ring-brand-500/20'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <span className="font-bold uppercase tracking-wider text-[10px] text-brand-600 block">{a.label}</span>
                  <span className="font-bold text-ink block mt-0.5">{a.name}</span>
                  <span className="text-muted truncate block">{a.line1}, {a.city}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedAddressId('custom');
                  setName('');
                  setPhone('');
                  setLine1('');
                  setCity('');
                  setPincode('');
                }}
                className={`text-left p-3 rounded-xl border text-xs font-semibold transition ${
                  selectedAddressId === 'custom'
                    ? 'border-brand-500 bg-orange-50/60 text-brand-700 ring-2 ring-brand-500/20'
                    : 'border-dashed border-zinc-300 text-muted hover:border-zinc-400'
                }`}
              >
                + Enter a new address
              </button>
            </div>
          </div>
        )}

        <fieldset className="grid gap-4 rounded-card bg-white p-5 shadow-card sm:grid-cols-2">
          <legend className="sr-only">Delivery address</legend>
          <label className="text-sm font-semibold">
            Full name
            <input
              name="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={input}
            />
            {fe('name')}
          </label>
          <label className="text-sm font-semibold">
            Mobile number
            <input
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={input}
            />
            {fe('phone')}
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Address
            <input
              name="line1"
              autoComplete="street-address"
              required
              value={line1}
              onChange={(e) => setLine1(e.target.value)}
              className={input}
            />
            {fe('line1')}
          </label>
          <label className="text-sm font-semibold">
            City
            <input
              name="city"
              autoComplete="address-level2"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={input}
            />
            {fe('city')}
          </label>
          <label className="text-sm font-semibold">
            Pincode
            <input
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              className={input}
            />
            {fe('pincode')}
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded-card bg-white p-5 shadow-card">
          <legend className="px-1 text-sm font-bold">Payment</legend>
          {([
            ['cod', 'Cash on delivery'],
            ['online', 'Pay online (UPI, cards, net banking)'],
          ] as const).map(([v, lbl]) => (
            <label
              key={v}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 text-sm font-semibold ${
                method === v ? 'border-brand-500 bg-orange-50' : 'border-zinc-200'
              }`}
            >
              <input
                type="radio"
                name="pm"
                checked={method === v}
                onChange={() => setMethod(v)}
                className="accent-orange-500"
              />
              {lbl}
            </label>
          ))}
        </fieldset>
      </section>

      <aside className="h-fit space-y-4 rounded-card bg-white p-5 shadow-card lg:sticky lg:top-24">
        {cart.data.totals && <TotalsTable t={cart.data.totals} />}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-xl bg-brand-500 py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Processing…' : method === 'cod' ? 'Place order' : 'Pay & place order'}
        </button>
      </aside>
    </form>
  );
}
