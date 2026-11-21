import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { RestaurantCard, RestaurantSkeletons } from '../components/cards';
import { Chip, EmptyState, ErrorState } from '../components/ui';
import { useCategories, useRestaurants } from '../lib/queries';

export default function Restaurants() {
  const [sp, setSp] = useSearchParams();
  const cats = useCategories();
  const cuisine = sp.get('cuisine') ?? '';
  const veg = sp.get('veg') === 'true';
  const open = sp.get('open') === 'true';
  const sort = sp.get('sort') ?? 'rating';
  const page = Number(sp.get('page') ?? 1) || 1;
  const { data, isLoading, isFetching, isError, error, refetch } = useRestaurants({ cuisine, veg: veg || undefined, open: open || undefined, sort, page, limit: 9 });

  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(sp);
    if (v) next.set(k, v); else next.delete(k);
    if (k !== 'page') next.delete('page');
    setSp(next);
  };

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Restaurants</h1>
      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        <Chip active={!cuisine} onClick={() => set('cuisine', null)}>All</Chip>
        {cats.data?.items.map((c) => <Chip key={c._id} active={cuisine.toLowerCase() === c.name.toLowerCase()} onClick={() => set('cuisine', c.name)}>{c.emoji} {c.name}</Chip>)}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip active={veg} onClick={() => set('veg', veg ? null : 'true')}>Pure veg</Chip>
        <Chip active={open} onClick={() => set('open', open ? null : 'true')}>Open now</Chip>
        <label className="ml-auto text-sm font-semibold text-muted">
          Sort{' '}
          <select value={sort} onChange={(e) => set('sort', e.target.value)} className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-ink">
            <option value="rating">Top rated</option>
            <option value="time">Fastest delivery</option>
            <option value="price">Price: low to high</option>
          </select>
        </label>
      </div>

      <div className={`mt-6 transition-opacity ${isFetching && !isLoading ? 'opacity-60' : ''}`}>
        {isError ? <ErrorState message={error.message} onRetry={() => refetch()} /> : data && data.items.length === 0 ? (
          <EmptyState title="No restaurants match" hint="Try removing a filter." action={<button onClick={() => setSp({})} className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">Clear filters</button>} />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? <RestaurantSkeletons n={6} /> : data?.items.map((r) => <RestaurantCard key={r._id} r={r} />)}
          </div>
        )}
      </div>

      {data && data.pages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
          <button disabled={page <= 1} onClick={() => set('page', String(page - 1))} aria-label="Previous page" className="rounded-full border p-2 disabled:opacity-30"><ChevronLeft className="size-4" /></button>
          <span className="text-sm font-semibold">Page {data.page} of {data.pages}</span>
          <button disabled={page >= data.pages} onClick={() => set('page', String(page + 1))} aria-label="Next page" className="rounded-full border p-2 disabled:opacity-30"><ChevronRight className="size-4" /></button>
        </nav>
      )}
    </>
  );
}
