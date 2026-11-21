import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, ApiError } from '../lib/api';
import { useAuth, User } from '../stores/auth';

const input = 'w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const isLogin = mode === 'login';
  // Only same-site relative paths are allowed as a post-login destination (prevents open redirects).
  const next = sp.get('next')?.startsWith('/') && !sp.get('next')!.startsWith('//') ? sp.get('next')! : '/';

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setError(''); setFields({});
    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (!f.phone) delete f.phone;
    try {
      const r = await api<{ user: User; accessToken: string }>(`/auth/${mode}`, {}, { method: 'POST', json: f });
      useAuth.setState({ user: r.user, token: r.accessToken });
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFields(err.details ?? {});
      }
    } finally { setBusy(false); }
  }

  const fieldError = (k: string) => fields[k]?.[0] && <p className="mt-1 text-xs text-red-600">{fields[k][0]}</p>;
  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white p-8 shadow-card">
      <h1 className="text-2xl font-extrabold tracking-tight">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {!isLogin && <label className="block text-sm font-semibold">Name<input name="name" autoComplete="name" required className={input} />{fieldError('name')}</label>}
        <label className="block text-sm font-semibold">Email<input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required className={input} />{fieldError('email')}</label>
        {!isLogin && <label className="block text-sm font-semibold">Mobile (optional)<input name="phone" inputMode="numeric" autoComplete="tel" className={input} />{fieldError('phone')}</label>}
        <div className="flex justify-between items-center text-sm font-semibold">
          <label htmlFor="password-field">Password</label>
          {isLogin && <Link to="/forgot-password" className="text-xs text-brand-600 font-medium hover:underline">Forgot password?</Link>}
        </div>
        <input id="password-field" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isLogin ? 'current-password' : 'new-password'} required className={input} />{fieldError('password')}
        {!isLogin && <span className="mt-1 block text-xs font-normal text-muted">8+ characters with upper and lower case letters and a number.</span>}
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-brand-500 py-3 font-bold text-white transition hover:bg-brand-600 disabled:opacity-60">{busy ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</button>
      </form>

      {isLogin && (
        <div className="mt-6 pt-5 border-t border-zinc-100">
          <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2.5">Demo Sign-In Roles:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => { setEmail('admin@foodrush.com'); setPassword('Password@123'); }}
              className="p-2.5 rounded-xl bg-purple-50 text-purple-700 font-bold hover:bg-purple-100 transition text-left"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => { setEmail('chef@malabar.com'); setPassword('Password@123'); }}
              className="p-2.5 rounded-xl bg-orange-50 text-brand-700 font-bold hover:bg-orange-100 transition text-left"
            >
              🍳 Restaurant
            </button>
            <button
              type="button"
              onClick={() => { setEmail('rider@foodrush.com'); setPassword('Password@123'); }}
              className="p-2.5 rounded-xl bg-blue-50 text-blue-700 font-bold hover:bg-blue-100 transition text-left"
            >
              🛵 Delivery
            </button>
            <button
              type="button"
              onClick={() => { setEmail('customer@foodrush.com'); setPassword('Password@123'); }}
              className="p-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold hover:bg-zinc-200 transition text-left"
            >
              👤 Customer
            </button>
          </div>
        </div>
      )}

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? 'New to FoodRush? ' : 'Already have an account? '}
        <Link to={`${isLogin ? '/register' : '/login'}${sp.get('next') ? `?next=${encodeURIComponent(sp.get('next')!)}` : ''}`} className="font-semibold text-brand-600">{isLogin ? 'Create an account' : 'Sign in'}</Link>
      </p>
    </div>
  );
}
export const Login = () => <AuthForm mode="login" />;
export const Register = () => <AuthForm mode="register" />;
