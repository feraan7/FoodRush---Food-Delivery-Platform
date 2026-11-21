import { AlertCircle, SearchX, Star } from 'lucide-react';
import { ReactNode, useState } from 'react';

export const Skeleton = ({ className = '' }: { className?: string }) => <div className={`animate-pulse rounded-xl bg-zinc-200/70 ${className}`} />;

export const EmptyState = ({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) => (
  <div className="grid place-items-center rounded-card bg-surface py-16 text-center">
    <SearchX className="size-10 text-zinc-300" />
    <h3 className="mt-3 text-lg font-bold">{title}</h3>
    {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="grid place-items-center rounded-card border border-red-100 bg-red-50/60 py-12 text-center">
    <AlertCircle className="size-9 text-red-400" />
    <p className="mt-3 font-semibold">Couldn't load this</p>
    <p className="mt-1 text-sm text-muted">{message}</p>
    {onRetry && <button onClick={onRetry} className="mt-4 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600">Try again</button>}
  </div>
);

export const Rating = ({ value, count }: { value: number; count?: number }) => (
  <span className="inline-flex items-center gap-1 rounded-md bg-green-600 px-1.5 py-0.5 text-xs font-bold text-white">
    <Star className="size-3 fill-white" />
    {value.toFixed(1)}
    {count !== undefined && <span className="font-medium opacity-80">· {count}</span>}
  </span>
);

export const VegDot = ({ veg }: { veg: boolean }) => (
  <span className={`inline-grid size-4 shrink-0 place-items-center rounded-sm border-2 ${veg ? 'border-green-600' : 'border-red-600'}`} title={veg ? 'Vegetarian' : 'Non-vegetarian'}>
    <span className={`size-2 rounded-full ${veg ? 'bg-green-600' : 'bg-red-600'}`} />
  </span>
);

const EMOJI_IMAGE_FALLBACK: Record<string, string> = {
  '🍛': '/images/food/thalassery-biryani.jpg',
  '🍚': '/images/food/thalassery-biryani.jpg',
  '🍽️': '/images/food/kerala-sadya.jpg',
  '🐟': '/images/food/alleppey-fish-curry.jpg',
  '🦐': '/images/food/kerala-chemmeen-prawns.jpg',
  '🥞': '/images/food/appam-stew.jpg',
  '🥥': '/images/food/masala-dosa.jpg',
  '🍌': '/images/food/pazham-pori.jpg',
  '🥣': '/images/food/palada-payasam.jpg',
  '🍰': '/images/food/falooda-dessert.jpg',
  '🍕': '/images/food/margherita-pizza.jpg',
  '🍔': '/images/food/classic-burger.jpg',
  '🥡': '/images/food/kozhi-porichathu.jpg',
  '🥗': '/images/food/steamed-puttu.jpg',
};

// Shows the photo when there is one, otherwise falls back to a curated food image or emoji tile.
export const Tile = ({ image, emoji = '🍽️', className = '' }: { image?: string; emoji?: string; className?: string }) => {
  const [failed, setFailed] = useState(false);
  const fallbackImg = EMOJI_IMAGE_FALLBACK[emoji];
  const candidate = (!failed && image) ? image : (!failed ? fallbackImg : undefined);

  return candidate ? (
    <img
      src={candidate}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  ) : (
    <div aria-hidden className={`grid place-items-center bg-linear-to-br from-orange-100 via-orange-50 to-amber-100 ${className}`}>
      <span className="text-5xl drop-shadow-sm">{emoji}</span>
    </div>
  );
};

export const Chip = ({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition ${active ? 'border-brand-500 bg-brand-500 text-white' : 'border-zinc-200 bg-white hover:border-brand-500 hover:text-brand-600'}`}
  >
    {children}
  </button>
);
