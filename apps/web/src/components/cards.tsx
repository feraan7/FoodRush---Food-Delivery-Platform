import { Clock } from 'lucide-react';
import { Link } from 'react-router';
import { Food, inr, Restaurant } from '../lib/api';
import { Rating, Skeleton, Tile, VegDot } from './ui';

export function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <Link to={`/restaurants/${r.slug}`} className="group block overflow-hidden rounded-card bg-white shadow-card transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative overflow-hidden">
        <Tile image={r.image} emoji={r.emoji} className="h-40 w-full transition duration-300 group-hover:scale-105" />
        {!r.isOpen && <span className="absolute inset-0 grid place-items-center bg-black/50 text-sm font-bold text-white">Closed now</span>}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold leading-snug">{r.name}</h3>
          <Rating value={r.rating} />
        </div>
        <p className="mt-1 truncate text-sm text-muted">{r.cuisines.join(', ')}</p>
        <div className="mt-3 flex items-center gap-3 text-xs font-medium text-muted">
          <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{r.deliveryMins} min</span>
          <span>{inr(r.priceForTwo)} for two</span>
        </div>
      </div>
    </Link>
  );
}

export function FoodCard({ f }: { f: Food }) {
  return (
    <Link to={`/restaurants/${f.restaurant.slug}`} className="flex gap-4 rounded-card bg-white p-4 shadow-card transition hover:-translate-y-0.5">
      <Tile image={f.image} emoji={f.category.emoji} className="size-20 shrink-0 rounded-xl [&_span]:text-3xl" />
      <div className="min-w-0">
        <div className="flex items-center gap-2"><VegDot veg={f.isVeg} /><h3 className="truncate font-bold">{f.name}</h3></div>
        <p className="mt-0.5 truncate text-xs text-muted">{f.restaurant.name}</p>
        <p className="mt-2 font-bold text-brand-600">{inr(f.price)}</p>
      </div>
    </Link>
  );
}

export const RestaurantSkeletons = ({ n = 6 }: { n?: number }) => (
  <>{Array.from({ length: n }, (_, i) => (
    <div key={i} className="overflow-hidden rounded-card bg-white shadow-card"><Skeleton className="h-40 rounded-none" /><div className="space-y-2 p-4"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/2" /></div></div>
  ))}</>
);

export const FoodSkeletons = ({ n = 4 }: { n?: number }) => (
  <>{Array.from({ length: n }, (_, i) => <Skeleton key={i} className="h-28" />)}</>
);
