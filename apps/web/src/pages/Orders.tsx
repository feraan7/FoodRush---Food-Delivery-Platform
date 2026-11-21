import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Link, useParams, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, CheckCircle2, RotateCcw, Star, X } from 'lucide-react';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { api, inr } from '../lib/api';
import { useOrder, useOrders } from '../lib/queries';
import { useAuth } from '../stores/auth';
import { TotalsTable } from './Cart';

const STEPS = [
  ['pending', 'Order placed'],
  ['confirmed', 'Confirmed'],
  ['preparing', 'Preparing in kitchen'],
  ['ready_for_pickup', 'Ready for pickup'],
  ['picked_up', 'Picked up by delivery partner'],
  ['out_for_delivery', 'Out for delivery'],
  ['delivered', 'Delivered'],
] as const;

const label = (s: string) => s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const when = (d: string) => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export function OrderHistory() {
  const [sp, setSp] = useSearchParams();
  const page = Number(sp.get('page') ?? 1) || 1;
  const { data, isLoading, isError, error, refetch } = useOrders(page);

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data?.items.length) {
    return (
      <EmptyState
        title="No orders yet"
        hint="Your orders will show up here."
        action={
          <Link to="/restaurants" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
            Order now
          </Link>
        }
      />
    );
  }

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Your orders</h1>
      <ul className="mt-5 space-y-3">
        {data.items.map((o) => (
          <li key={o._id}>
            <Link
              to={`/orders/${o._id}`}
              className="flex items-center justify-between gap-4 rounded-card bg-white p-5 shadow-card transition hover:-translate-y-0.5"
            >
              <div>
                <p className="font-bold">
                  {o.restaurant.emoji} {o.restaurant.name}
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {o.orderNumber} · {when(o.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">{inr(o.pricing.total)}</p>
                <p
                  className={`text-xs font-semibold ${
                    o.status === 'cancelled' ? 'text-red-600' : o.status === 'delivered' ? 'text-green-600' : 'text-brand-600'
                  }`}
                >
                  {label(o.status)}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {data.pages > 1 && (
        <div className="mt-6 flex justify-center gap-4 text-sm font-semibold">
          <button disabled={page <= 1} onClick={() => setSp({ page: String(page - 1) })} className="disabled:opacity-30">
            Previous
          </button>
          <span>
            Page {data.page} of {data.pages}
          </span>
          <button disabled={page >= data.pages} onClick={() => setSp({ page: String(page + 1) })} className="disabled:opacity-30">
            Next
          </button>
        </div>
      )}
    </>
  );
}

export function OrderTracking() {
  const { id = '' } = useParams();
  const qc = useQueryClient();
  const token = useAuth((s) => s.token);
  const { data, isLoading, isError, error, refetch } = useOrder(id);
  const [reviewOpen, setReviewOpen] = useState(false);

  // Live updates: join this order's room and refetch whenever the server announces a change.
  useEffect(() => {
    if (!token) return;
    const socket = io({ auth: { token } });
    socket.on('connect', () => socket.emit('order:join', id));
    socket.on('order:updated', (e: { orderId: string }) => {
      if (e.orderId === id) qc.invalidateQueries({ queryKey: ['order', id] });
    });
    return () => {
      socket.disconnect();
    };
  }, [id, token, qc]);

  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    await api(`/orders/${id}/status`, {}, { method: 'PATCH', json: { status: 'cancelled' } });
    qc.invalidateQueries({ queryKey: ['order', id] });
  }

  if (isLoading) return <Skeleton className="h-64" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const o = data!.order;
  const idx = STEPS.findIndex(([s]) => s === o.status);
  const cancelled = o.status === 'cancelled';
  const awaitingPayment = o.paymentStatus === 'unpaid';

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <section>
        <p className="text-sm font-semibold text-muted">{o.orderNumber}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">
          {cancelled
            ? 'Order cancelled'
            : awaitingPayment
            ? 'Awaiting payment'
            : o.status === 'delivered'
            ? 'Order Delivered'
            : 'Tracking your order'}
        </h1>
        <p className="mt-1 text-muted">
          {o.restaurant.emoji} {o.restaurant.name} · {when(o.createdAt)}
        </p>

        {cancelled ? (
          <div className="mt-6 rounded-card bg-red-50 p-5 text-sm text-red-700 space-y-2">
            <p className="font-bold">This order was cancelled.</p>
            {o.paymentStatus === 'refund_pending' && (
              <p className="text-xs font-semibold text-amber-800 bg-amber-100 p-2.5 rounded-xl">
                Payment refund is currently pending review by administrators. You will be refunded shortly.
              </p>
            )}
            {o.paymentStatus === 'refunded' && (
              <div className="text-xs font-semibold text-green-800 bg-green-100 p-2.5 rounded-xl space-y-0.5">
                <p>Refund Processed successfully!</p>
                {o.refundDetails && (
                  <p className="text-[11px] text-green-700">Ref ID: {o.refundDetails.refundId} · Reason: {o.refundDetails.reason}</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <ol className="mt-6 space-y-0 rounded-card bg-white p-6 shadow-card" aria-label="Order progress">
            {STEPS.map(([s, text], i) => {
              const done = i <= idx && !awaitingPayment;
              const at = o.history.find((h) => h.status === s)?.at;
              return (
                <li key={s} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid size-7 place-items-center rounded-full text-white ${
                        done ? 'bg-brand-500' : 'bg-zinc-200'
                      }`}
                    >
                      {done && <Check className="size-4" />}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span className={`h-8 w-0.5 ${i < idx && !awaitingPayment ? 'bg-brand-500' : 'bg-zinc-200'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`font-semibold ${done ? '' : 'text-muted'}`}>{text}</p>
                    {at && <p className="text-xs text-muted">{when(at)}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {/* Delivery partner info if assigned */}
        {o.partner && (
          <div className="mt-4 rounded-card bg-white p-4 shadow-card flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-ink">🛵 Delivery Partner Assigned</p>
              <p className="text-muted">{o.partner.name} {o.partner.phone ? `(${o.partner.phone})` : ''}</p>
            </div>
            <span className="font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">On the way</span>
          </div>
        )}

        {/* Delivered Review Button */}
        {o.status === 'delivered' && (
          <div className="mt-6 rounded-2xl bg-orange-50 border border-orange-200 p-5 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-ink">Enjoyed your food?</h3>
              <p className="text-xs text-muted">Leave a rating and review for {o.restaurant.name}</p>
            </div>
            {o.reviewed ? (
              <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
                <Check className="size-3.5" /> Reviewed
              </span>
            ) : (
              <button
                onClick={() => setReviewOpen(true)}
                className="flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-600 shadow-sm"
              >
                <Star className="size-3.5 fill-white" /> Rate Order
              </button>
            )}
          </div>
        )}

        {!cancelled && ['pending', 'confirmed'].includes(o.status) && (
          <button
            onClick={cancel}
            className="mt-5 rounded-full border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Cancel order
          </button>
        )}
      </section>

      <aside className="h-fit space-y-5 rounded-card bg-white p-5 shadow-card">
        <ul className="space-y-2 text-sm">
          {o.items.map((i) => (
            <li key={i.name} className="flex justify-between">
              <span>
                {i.qty} × {i.name}
              </span>
              <span>{inr(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <TotalsTable t={o.pricing} />
        <div className="border-t pt-4 text-sm text-muted">
          <p className="font-semibold text-ink">Delivering to</p>
          <p>
            {o.address.name}, {o.address.line1}, {o.address.city} {o.address.pincode}
          </p>
          <p className="mt-2">
            {o.paymentMethod === 'cod'
              ? 'Cash on delivery'
              : o.paymentStatus === 'unpaid'
              ? 'Payment pending'
              : 'Paid online'}
          </p>
        </div>
      </aside>

      {reviewOpen && (
        <ReviewModal
          orderId={o._id}
          restaurantName={o.restaurant.name}
          onClose={() => setReviewOpen(false)}
          onSaved={() => {
            setReviewOpen(false);
            qc.invalidateQueries({ queryKey: ['order', id] });
          }}
        />
      )}
    </div>
  );
}

function ReviewModal({
  orderId,
  restaurantName,
  onClose,
  onSaved,
}: {
  orderId: string;
  restaurantName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await api('/reviews', {}, {
        method: 'POST',
        json: { orderId, rating, comment },
      });
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit review');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
          <h3 className="font-extrabold text-base">Rate {restaurantName}</h3>
          <button onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface">
            <X className="size-5" />
          </button>
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          <div className="text-center py-2">
            <p className="text-muted mb-2 uppercase">Your Rating</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={`size-7 ${
                      star <= rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-muted mb-1 uppercase">Write a review (optional)</label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about the food taste, packaging, delivery speed..."
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-xs font-normal focus:border-brand-500 outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-zinc-200 py-2.5 text-xs font-bold text-muted hover:bg-surface"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-600 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
