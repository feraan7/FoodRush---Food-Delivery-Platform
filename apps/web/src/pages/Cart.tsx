import { Minus, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { EmptyState, ErrorState, Skeleton, VegDot } from '../components/ui';
import { ApiError, inr, Totals } from '../lib/api';
import { useCart, useCartActions } from '../lib/queries';

export const TotalsTable = ({ t }: { t: Totals }) => (
  <dl className="space-y-2 text-sm">
    <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{inr(t.subtotal)}</dd></div>
    {t.discount > 0 && <div className="flex justify-between text-green-700"><dt>Coupon discount</dt><dd>− {inr(t.discount)}</dd></div>}
    <div className="flex justify-between"><dt className="text-muted">Delivery</dt><dd>{t.deliveryFee ? inr(t.deliveryFee) : 'Free'}</dd></div>
    <div className="flex justify-between"><dt className="text-muted">Taxes (GST)</dt><dd>{inr(t.tax)}</dd></div>
    <div className="flex justify-between border-t pt-3 text-base font-extrabold"><dt>To pay</dt><dd>{inr(t.total)}</dd></div>
  </dl>
);

export default function CartPage() {
  const [applied, setApplied] = useState('');
  const [couponMsg, setCouponMsg] = useState('');
  const cart = useCart(applied || undefined);
  const { setQty } = useCartActions();

  useEffect(() => {
    if (cart.error instanceof ApiError && cart.error.code === 'COUPON_INVALID') { setCouponMsg(cart.error.message); setApplied(''); }
  }, [cart.error]);

  const apply = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setCouponMsg('');
    setApplied(String(new FormData(e.currentTarget).get('code') ?? '').trim());
  };

  if (cart.isLoading) return <Skeleton className="h-64" />;
  if (cart.isError && !(cart.error instanceof ApiError && cart.error.code === 'COUPON_INVALID')) return <ErrorState message={cart.error.message} onRetry={() => cart.refetch()} />;
  const data = cart.data;
  if (!data || data.items.length === 0) return <EmptyState title="Your cart is empty" hint="Add dishes from a restaurant to get started." action={<Link to="/restaurants" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">Browse restaurants</Link>} />;
  const blocked = data.items.some((i) => !i.available);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>
        {data.restaurant && <p className="mt-1 text-muted">from <Link className="font-semibold text-ink hover:underline" to={`/restaurants/${data.restaurant.slug}`}>{data.restaurant.name}</Link></p>}
        <ul className="mt-5 divide-y divide-zinc-100 rounded-card bg-white shadow-card">
          {data.items.map((i) => (
            <li key={i.foodId} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><VegDot veg={i.isVeg} /><span className="truncate font-bold">{i.name}</span></div>
                <p className="mt-0.5 text-sm text-muted">{inr(i.price)}</p>
                {!i.available && <p className="mt-1 text-xs font-semibold text-red-600">No longer available — remove it to continue</p>}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border border-zinc-200">
                  <button aria-label={`Decrease ${i.name}`} onClick={() => setQty.mutate({ foodId: i.foodId, qty: i.qty - 1 })} className="p-2"><Minus className="size-4" /></button>
                  <span className="w-6 text-center text-sm font-bold" aria-live="polite">{i.qty}</span>
                  <button aria-label={`Increase ${i.name}`} disabled={i.qty >= 20} onClick={() => setQty.mutate({ foodId: i.foodId, qty: i.qty + 1 })} className="p-2 disabled:opacity-30"><Plus className="size-4" /></button>
                </div>
                <span className="w-16 text-right font-bold">{inr(i.price * i.qty)}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <aside className="h-fit space-y-5 rounded-card bg-white p-5 shadow-card lg:sticky lg:top-24">
        <form onSubmit={apply} className="flex gap-2">
          <input name="code" defaultValue={applied} placeholder="Coupon code" aria-label="Coupon code" className="min-w-0 flex-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm uppercase outline-none focus:border-brand-500" />
          <button className="rounded-xl bg-ink px-4 text-sm font-bold text-white">Apply</button>
        </form>
        {couponMsg && <p role="alert" className="-mt-2 text-xs text-red-600">{couponMsg}</p>}
        {data.coupon && <p className="-mt-2 text-xs font-semibold text-green-700">Coupon {data.coupon} applied</p>}
        {data.totals && <TotalsTable t={data.totals} />}
        {blocked ? <p className="text-center text-sm text-muted">Remove unavailable items to check out.</p> : (
          <Link to={applied ? `/checkout?coupon=${encodeURIComponent(applied)}` : '/checkout'} className="block rounded-xl bg-brand-500 py-3 text-center font-bold text-white transition hover:bg-brand-600">Proceed to checkout</Link>
        )}
      </aside>
    </div>
  );
}
