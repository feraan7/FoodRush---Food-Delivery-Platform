import { useQuery } from '@tanstack/react-query';
import { Clock, Flame, Heart, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, Review } from '../lib/api';
import { useCartActions } from '../lib/queries';
import { useAuth } from '../stores/auth';
import { EmptyState, ErrorState, Rating, Skeleton, Tile, VegDot } from '../components/ui';
import { api, inr } from '../lib/api';
import { useMenu } from '../lib/queries';

export default function RestaurantDetail() {
  const { slug = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useMenu(slug);
  const user = useAuth((st) => st.user);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { add } = useCartActions();
  const [notice, setNotice] = useState('');
  const [isFav, setIsFav] = useState(false);

  // Reviews query
  const restaurantId = data?.restaurant?._id;
  const { data: reviewsData } = useQuery({
    queryKey: ['restaurant-reviews', restaurantId],
    queryFn: () => api<{ items: Review[]; total: number }>(`/restaurants/${restaurantId}/reviews`),
    enabled: !!restaurantId,
  });

  async function toggleFav() {
    if (!user) return navigate(`/login?next=${encodeURIComponent(pathname)}`);
    if (!restaurantId) return;
    try {
      const res: any = await api('/favourites/toggle', {}, {
        method: 'POST',
        json: { type: 'restaurant', id: restaurantId },
      });
      setIsFav(res.isFavourite);
    } catch {
      /* ignore */
    }
  }

  async function addToCart(foodId: string) {
    if (!user) return navigate(`/login?next=${encodeURIComponent(pathname)}`);
    setNotice('');
    try {
      await add.mutateAsync({ foodId, qty: 1 });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        navigate(`/login?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (e instanceof ApiError && e.code === 'CART_CONFLICT') {
        if (confirm('Your cart has items from another restaurant. Start a new cart?')) {
          await add.mutateAsync({ foodId, qty: 1, replace: true });
        }
      } else {
        setNotice(e instanceof Error ? e.message : 'Could not add to cart');
      }
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    const notFound = error.message === 'Restaurant not found';
    return notFound ? (
      <EmptyState
        title="Restaurant not found"
        hint="It may have been removed."
        action={
          <Link to="/restaurants" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
            Browse restaurants
          </Link>
        }
      />
    ) : (
      <ErrorState message={error.message} onRetry={() => refetch()} />
    );
  }

  const { restaurant: r, menu } = data!;
  const reviews = reviewsData?.items || [];

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-card sm:flex">
        <Tile image={r.image} emoji={r.emoji} className="h-48 sm:h-auto sm:w-72 sm:shrink-0" />
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-extrabold tracking-tight">{r.name}</h1>
                <Rating value={r.rating} count={r.ratingCount} />
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-bold ${
                    r.isOpen ? 'bg-green-100 text-green-700' : 'bg-zinc-200 text-zinc-600'
                  }`}
                >
                  {r.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              <button
                onClick={toggleFav}
                className="rounded-full p-2 hover:bg-orange-50 transition text-muted hover:text-red-500"
                title="Bookmark restaurant"
              >
                <Heart className={`size-6 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
              </button>
            </div>

            <p className="mt-1 text-muted">{r.cuisines.join(' · ')}</p>
            {r.description && <p className="mt-2 text-xs text-muted max-w-lg">{r.description}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-sm font-semibold pt-3 border-t border-zinc-100">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-4 text-brand-500" />
              {r.deliveryMins} min
            </span>
            <span>{inr(r.priceForTwo)} for two</span>
          </div>
        </div>
      </div>

      {notice && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
          {notice}
        </p>
      )}

      {menu.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="Menu coming soon" hint="This restaurant hasn't added any dishes yet." />
        </div>
      ) : (
        <>
          <nav
            aria-label="Menu categories"
            className="sticky top-[57px] z-10 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-white/90 px-4 py-3 backdrop-blur"
          >
            {menu.map((g) => (
              <a
                key={g.category._id}
                href={`#cat-${g.category._id}`}
                className="whitespace-nowrap rounded-full bg-surface px-4 py-1.5 text-sm font-semibold hover:bg-orange-50 hover:text-brand-600"
              >
                {g.category.emoji} {g.category.name}
              </a>
            ))}
          </nav>

          {menu.map((g) => (
            <section key={g.category._id} id={`cat-${g.category._id}`} className="mt-6 scroll-mt-32">
              <h2 className="text-xl font-extrabold">{g.category.name}</h2>
              <ul className="mt-3 divide-y divide-zinc-100 rounded-card bg-white shadow-card">
                {g.items.map((f) => (
                  <li key={f._id} className="flex items-start justify-between gap-4 p-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <VegDot veg={f.isVeg} />
                        {f.isBestseller && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600">
                            <Flame className="size-3.5" />
                            Bestseller
                          </span>
                        )}
                      </div>
                      <h3 className="mt-1 font-bold">{f.name}</h3>
                      <p className="mt-0.5 text-sm font-semibold">{inr(f.price)}</p>
                      {f.description && <p className="mt-1 max-w-md text-sm text-muted">{f.description}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col items-center gap-2">
                      <Tile image={f.image} emoji={g.category.emoji} className="size-24 rounded-xl [&_span]:text-4xl" />
                      <button
                        disabled={!r.isOpen || add.isPending || f.isAvailable === false}
                        onClick={() => addToCart(f._id)}
                        className="-mt-5 rounded-lg border border-brand-500 bg-white px-5 py-1 text-sm font-bold text-brand-600 shadow-sm transition hover:bg-brand-500 hover:text-white disabled:opacity-40"
                      >
                        {f.isAvailable === false ? 'Sold out' : 'Add'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      {/* Customer Reviews Section */}
      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold tracking-tight">Customer Reviews</h2>
          <div className="flex items-center gap-2 text-sm font-bold">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span>{r.rating.toFixed(1)}</span>
            <span className="text-muted font-normal">({r.ratingCount} reviews)</span>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-surface p-8 text-center text-xs text-muted">
            No customer reviews yet. Order from this kitchen to be the first to leave a review!
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {reviews.map((rev) => (
              <div key={rev._id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-card space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-ink">{rev.user?.name || 'Verified Customer'}</span>
                  <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-md text-xs font-bold text-green-700">
                    <Star className="size-3 fill-green-600 text-green-600" />
                    <span>{rev.rating}</span>
                  </div>
                </div>
                {rev.comment && <p className="text-xs text-zinc-600 leading-relaxed">{rev.comment}</p>}
                <span className="text-[10px] text-muted block">
                  {new Date(rev.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
