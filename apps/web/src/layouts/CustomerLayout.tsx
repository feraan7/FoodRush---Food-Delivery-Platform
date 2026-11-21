import { motion } from 'framer-motion';
import { Heart, Search, ShoppingBag, User as UserIcon } from 'lucide-react';
import { FormEvent } from 'react';
import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { NotificationBell } from '../components/NotificationBell';
import { api } from '../lib/api';
import { useCart } from '../lib/queries';
import { useAuth } from '../stores/auth';

export const Logo = () => (
  <Link to="/" className="text-2xl font-extrabold tracking-tight">Food<span className="text-brand-500">Rush</span></Link>
);

export default function CustomerLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const qc = useQueryClient();
  const { user, ready } = useAuth();
  const count = useCart().data?.count ?? 0;

  async function logout() {
    await api('/auth/logout', {}, { method: 'POST' }).catch(() => undefined);
    useAuth.setState({ user: null, token: null });
    qc.clear();
    navigate('/');
  }

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    if (q.length >= 2) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <div className="bg-ink px-4 py-2 text-center text-xs font-medium text-white flex justify-center items-center gap-4">
        <span>Fresh food from local kitchens, delivered fast</span>
        {user?.role === 'customer' && (
          <Link to="/delivery" className="hidden sm:inline text-orange-400 hover:underline font-bold">
            • Deliver with FoodRush →
          </Link>
        )}
      </div>

      <header className="sticky top-0 z-20 border-b border-zinc-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Logo />
          <nav className="ml-4 hidden gap-5 text-sm font-semibold text-muted md:flex items-center">
            <Link to="/restaurants" className="hover:text-ink">Restaurants</Link>
            {user && (
              <>
                <Link to="/favourites" className="hover:text-ink flex items-center gap-1">
                  Favourites
                </Link>
                <Link to="/orders" className="hover:text-ink">Orders</Link>
              </>
            )}

            {/* Role specific portals */}
            {user?.role === 'restaurant' && (
              <Link to="/restaurant" className="text-brand-600 font-bold hover:underline">
                Restaurant Portal
              </Link>
            )}
            {user?.role === 'delivery' && (
              <Link to="/delivery" className="text-brand-600 font-bold hover:underline">
                Delivery Portal
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-purple-700 font-bold hover:underline">
                Admin Panel
              </Link>
            )}
          </nav>

          <form onSubmit={onSearch} role="search" className="ml-auto flex w-full max-w-xs items-center gap-2 rounded-full bg-surface px-4 py-2 ring-1 ring-zinc-200 focus-within:ring-brand-500">
            <Search className="size-4 text-muted" />
            <input key={params.get('q') ?? ''} name="q" defaultValue={params.get('q') ?? ''} placeholder="Search dishes or restaurants" aria-label="Search" className="w-full bg-transparent text-sm outline-none" />
          </form>

          <div className="flex items-center gap-3 text-sm font-semibold">
            {user && (
              <>
                <NotificationBell />
                <Link to="/favourites" aria-label="Favourites" className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink">
                  <Heart className="size-5" />
                </Link>
                <Link to="/profile" aria-label="Profile" className="rounded-full p-2 text-muted hover:bg-surface hover:text-ink">
                  <UserIcon className="size-5" />
                </Link>
              </>
            )}

            <Link to="/cart" aria-label={`Cart, ${count} items`} className="relative rounded-full p-2 hover:bg-surface">
              <ShoppingBag className="size-5" />
              {count > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">{count}</span>}
            </Link>

            {ready && (
              user ? (
                <button onClick={logout} className="text-muted hover:text-ink">Sign out</button>
              ) : (
                <Link to="/login" className="rounded-full bg-ink px-4 py-1.5 text-white">Sign in</Link>
              )
            )}
          </div>
        </div>
      </header>

      <motion.main key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </motion.main>

      <footer className="border-t border-zinc-100 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row">
          <Logo />
          <div className="flex gap-4 text-xs font-semibold">
            <Link to="/restaurants" className="hover:text-ink">Restaurants</Link>
            <Link to="/delivery" className="hover:text-ink">Become a Delivery Partner</Link>
            <Link to="/restaurant" className="hover:text-ink">Partner Kitchens</Link>
            <Link to="/admin" className="hover:text-ink">Admin</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} FoodRush. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
