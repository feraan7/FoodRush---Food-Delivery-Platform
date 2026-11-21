import { useSearchParams } from 'react-router';
import { FoodCard, FoodSkeletons, RestaurantCard, RestaurantSkeletons } from '../components/cards';
import { EmptyState, ErrorState } from '../components/ui';
import { useSearch } from '../lib/queries';

export default function Search() {
  const [sp] = useSearchParams();
  const q = (sp.get('q') ?? '').trim();
  const { data, isLoading, isError, error, refetch } = useSearch(q);

  if (q.length < 2) return <EmptyState title="Search FoodRush" hint="Type at least 2 characters to find dishes and restaurants." />;
  if (isError) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  const none = data && data.restaurants.length === 0 && data.foods.length === 0;

  return (
    <>
      <h1 className="text-3xl font-extrabold tracking-tight">Results for “{q}”</h1>
      {none ? <div className="mt-6"><EmptyState title="Nothing found" hint="Check the spelling or try a broader term like “biryani”." /></div> : (
        <>
          {(isLoading || data!.restaurants.length > 0) && (
            <section className="mt-8"><h2 className="mb-4 text-xl font-extrabold">Restaurants</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{isLoading ? <RestaurantSkeletons n={3} /> : data!.restaurants.map((r) => <RestaurantCard key={r._id} r={r} />)}</div>
            </section>
          )}
          {(isLoading || data!.foods.length > 0) && (
            <section className="mt-10"><h2 className="mb-4 text-xl font-extrabold">Dishes</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{isLoading ? <FoodSkeletons /> : data!.foods.map((f) => <FoodCard key={f._id} f={f} />)}</div>
            </section>
          )}
        </>
      )}
    </>
  );
}
