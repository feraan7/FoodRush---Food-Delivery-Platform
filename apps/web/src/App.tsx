import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import Protected from './components/Protected';
import { refreshSession } from './lib/api';
import { useAuth } from './stores/auth';
import CartPage from './pages/Cart';
import Checkout from './pages/Checkout';
import { Login, Register } from './pages/AuthPages';
import ForgotPassword from './pages/ForgotPassword';
import { OrderHistory, OrderTracking } from './pages/Orders';
import CustomerLayout from './layouts/CustomerLayout';
import Home from './pages/Home';
import RestaurantDetail from './pages/RestaurantDetail';
import Restaurants from './pages/Restaurants';
import Search from './pages/Search';
import Favourites from './pages/Favourites';
import Profile from './pages/Profile';
import RestaurantDashboard from './pages/RestaurantDashboard';
import DeliveryPortal from './pages/DeliveryPortal';
import AdminPanel from './pages/AdminPanel';
import { EmptyState } from './components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // Restore the session on page load using the refresh cookie.
  useEffect(() => {
    refreshSession().finally(() => useAuth.setState({ ready: true }));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="restaurants" element={<Restaurants />} />
            <Route path="restaurants/:slug" element={<RestaurantDetail />} />
            <Route path="search" element={<Search />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />

            <Route element={<Protected />}>
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<Checkout />} />
              <Route path="orders" element={<OrderHistory />} />
              <Route path="orders/:id" element={<OrderTracking />} />
              <Route path="favourites" element={<Favourites />} />
              <Route path="profile" element={<Profile />} />
              <Route path="restaurant" element={<RestaurantDashboard />} />
              <Route path="delivery" element={<DeliveryPortal />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>

            <Route
              path="*"
              element={
                <EmptyState
                  title="Page not found"
                  action={
                    <Link to="/" className="rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white">
                      Go home
                    </Link>
                  }
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
