import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { CheckCircle2, KeyRound, Lock, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../stores/auth';

export default function ForgotPassword() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const navigate = useNavigate();

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const res: any = await api('/auth/forgot-password', {}, { method: 'POST', json: { email } });
      setNotice(res.message);
      if (res.resetToken) {
        setToken(res.resetToken);
      }
      setStep('reset');
    } catch (err: any) {
      setError(err?.message || 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res: any = await api('/auth/reset-password', {}, { method: 'POST', json: { token, password } });
      useAuth.setState({ user: res.user, token: res.accessToken });
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto my-12 rounded-3xl border border-zinc-200 bg-white p-8 shadow-card space-y-6">
      <div className="text-center space-y-2">
        <div className="size-14 rounded-full bg-orange-100 text-brand-600 grid place-items-center mx-auto">
          <KeyRound className="size-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">
          {step === 'request' ? 'Reset Password' : 'Enter New Password'}
        </h1>
        <p className="text-xs text-muted">
          {step === 'request'
            ? "Enter your account email and we'll send you a password reset code."
            : 'Enter the reset token and set your new account password.'}
        </p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl">{error}</p>}
      {notice && (
        <div className="flex items-start gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-800">
          <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={handleRequest} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-muted mb-1 uppercase">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 text-xs font-bold text-white hover:bg-brand-600 shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Sending code...' : 'Continue'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleReset} className="space-y-4 text-xs font-semibold">
          <div>
            <label className="block text-muted mb-1 uppercase">Reset Token</label>
            <input
              type="text"
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste the reset token"
              className="w-full rounded-xl border border-zinc-200 p-2.5 text-sm font-mono focus:border-brand-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-muted mb-1 uppercase">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 chars, 1 uppercase, 1 number"
                className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm font-normal focus:border-brand-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-500 py-3 text-xs font-bold text-white hover:bg-brand-600 shadow-sm transition disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Save New Password & Sign In'}
          </button>
        </form>
      )}

      <div className="text-center pt-2">
        <Link to="/login" className="text-xs font-semibold text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
