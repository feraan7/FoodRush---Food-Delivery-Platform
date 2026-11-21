import { ArrowRight } from 'lucide-react';
import { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { FoodCard, FoodSkeletons, RestaurantCard, RestaurantSkeletons } from '../components/cards';
import { EmptyState, ErrorState, Skeleton } from '../components/ui';
import { useCategories, useFoods, useRestaurants } from '../lib/queries';

const Section = ({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) => (
  <section className="mt-14">
    <div className="mb-5 flex items-end justify-between">
      <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
      {to && <Link to={to} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">See all <ArrowRight className="size-4" /></Link>}
    </div>
    {children}
  </section>
);

export default function Home() {
  const navigate = useNavigate();
  const cats = useCategories();
  const popular = useRestaurants({ sort: 'rating', limit: 6 });
  const dishes = useFoods({ bestseller: true, limit: 8 });

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <section className="overflow-hidden rounded-3xl bg-linear-to-br from-brand-500 to-brand-600 px-6 py-14 text-white sm:px-12 sm:py-20">
        <h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Authentic Kerala flavors, delivered hot to your doorstep.</h1>
        <p className="mt-4 max-w-md text-white/85">Order Thalassery biryanis, backwater seafood, traditional Sadya feasts, and your favourite local meals.</p>
        <form onSubmit={onSearch} role="search" className="mt-8 flex max-w-lg overflow-hidden rounded-full bg-white p-1.5 shadow-xl">
          <input name="q" placeholder="Search Thalassery biryani, sadya, appam, fish curry…" aria-label="Search restaurants and dishes" className="min-w-0 flex-1 bg-transparent px-4 text-ink outline-none placeholder:text-zinc-400" />
          <button className="rounded-full bg-ink px-6 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800">Search</button>
        </form>
      </section>

      <Section title="What are you craving?">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {cats.isLoading && Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-24 w-24 shrink-0" />)}
          {cats.data?.items.map((c) => (
            <Link key={c._id} to={`/restaurants?cuisine=${encodeURIComponent(c.name)}`} className="grid w-24 shrink-0 place-items-center gap-1 rounded-2xl bg-surface p-3 text-center transition hover:bg-orange-50 hover:ring-1 hover:ring-brand-500">
              <span className="text-3xl">{c.emoji}</span>
              <span className="text-xs font-semibold">{c.name}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Popular restaurants" to="/restaurants">
        {popular.isError ? <ErrorState message={popular.error.message} onRetry={() => popular.refetch()} /> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.isLoading ? <RestaurantSkeletons /> : popular.data?.items.map((r) => <RestaurantCard key={r._id} r={r} />)}
          </div>
        )}
        {popular.data?.items.length === 0 && <EmptyState title="No restaurants yet" hint="Run the seed script to load sample data." />}
      </Section>

      <Section title="Best-selling dishes">
        {dishes.isError ? <ErrorState message={dishes.error.message} onRetry={() => dishes.refetch()} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {dishes.isLoading ? <FoodSkeletons /> : dishes.data?.items.map((f) => <FoodCard key={f._id} f={f} />)}
          </div>
        )}
      </Section>
    </>
  );
}
