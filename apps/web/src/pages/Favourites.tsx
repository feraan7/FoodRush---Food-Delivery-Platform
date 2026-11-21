import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, UtensilsCrossed } from 'lucide-react';
import { Link } from 'react-router';
import { FoodCard, RestaurantCard } from '../components/cards';
import { EmptyState, Skeleton } from '../components/ui';
import { api, Food, Restaurant } from '../lib/api';

export default function Favourites() {
  const { data, isLoading } = useQuery({
    queryKey: ['favourites'],
    queryFn: () => api<{ restaurants: Restaurant[]; foods: Food[] }>('/favourites'),
  });

  if (isLoading) return <Skeleton className="h-64" />;

  const restaurants = data?.restaurants || [];
  const foods = data?.foods || [];
  const isEmpty = restaurants.length === 0 && foods.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Your Favourites</h1>
        <p className="text-sm text-muted">Restaurants and dishes you've bookmarked for quick reordering</p>
      </div>

      {isEmpty ? (
        <EmptyState
          title="No favourites yet"
          hint="Tap the heart icon on any restaurant or dish to save it here."
          action={
            <Link to="/restaurants" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
              Discover Restaurants
            </Link>
          }
        />
      ) : (
        <>
          {restaurants.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Heart className="size-5 fill-red-500 text-red-500" /> Favourite Restaurants ({restaurants.length})
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {restaurants.map((r) => (
                  <RestaurantCard key={r._id} r={r} />
                ))}
              </div>
            </section>
          )}

          {foods.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <UtensilsCrossed className="size-5 text-brand-600" /> Favourite Dishes ({foods.length})
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {foods.map((f) => (
                  <FoodCard key={f._id} f={f} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
