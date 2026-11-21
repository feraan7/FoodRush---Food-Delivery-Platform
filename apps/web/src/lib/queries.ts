import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Cart, Category, Food, Order, Page, Restaurant } from './api';
import { useAuth } from '../stores/auth';

export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => api<{ items: Category[] }>('/categories'), staleTime: 5 * 60_000 });
export const useRestaurants = (p: Record<string, string | number | boolean | undefined>) =>
  useQuery({ queryKey: ['restaurants', p], queryFn: () => api<Page<Restaurant>>('/restaurants', p), placeholderData: keepPreviousData });
export const useFoods = (p: Record<string, string | number | boolean | undefined>) =>
  useQuery({ queryKey: ['foods', p], queryFn: () => api<Page<Food>>('/foods', p) });
export const useMenu = (slug: string) =>
  useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api<{ restaurant: Restaurant; menu: { category: Category; items: Food[] }[] }>(`/restaurants/${slug}`),
  });
export const useSearch = (q: string) =>
  useQuery({ queryKey: ['search', q], enabled: q.length >= 2, queryFn: () => api<{ restaurants: Restaurant[]; foods: Food[] }>('/search', { q }) });

export const useCart = (coupon?: string) => {
  const user = useAuth((s) => s.user);
  return useQuery({ queryKey: ['cart', coupon ?? ''], enabled: !!user, retry: false, queryFn: () => api<Cart>('/cart', { coupon }) });
};
export function useCartActions() {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ['cart'] });
  return {
    add: useMutation({ mutationFn: (v: { foodId: string; qty?: number; replace?: boolean }) => api<Cart>('/cart/items', {}, { method: 'POST', json: v }), onSuccess: done }),
    setQty: useMutation({ mutationFn: (v: { foodId: string; qty: number }) => api<Cart>(`/cart/items/${v.foodId}`, {}, { method: 'PATCH', json: { qty: v.qty } }), onSuccess: done }),
  };
}
export const useOrder = (id: string) => useQuery({ queryKey: ['order', id], queryFn: () => api<{ order: Order }>(`/orders/${id}`) });
export const useOrders = (page: number) => useQuery({ queryKey: ['orders', page], queryFn: () => api<Page<Order>>('/orders', { page, limit: 10 }) });
