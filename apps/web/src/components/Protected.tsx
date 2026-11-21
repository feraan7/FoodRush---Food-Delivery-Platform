import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../stores/auth';
import { Skeleton } from './ui';

// Customer-only area. Waits for the session check, then redirects to sign-in with a way back.
export default function Protected() {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <Skeleton className="h-64" />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />;
  return <Outlet />;
}
