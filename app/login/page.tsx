'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    setSubmitting(false);

    if (response.ok) {
      router.push('/dashboard');
      return;
    }

    const payload = await response.json();
    setError(payload?.message || 'Invalid credentials');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-14 sm:px-10">
        <div className="grid gap-10 rounded-[2rem] border border-slate-800 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/50 backdrop-blur-xl lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
              <p className="text-xs uppercase tracking-[0.4em] text-brand-300">MBHUB / MOUHIBHUB</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Secure enterprise dashboard access</h1>
              <p className="mt-4 text-slate-400">Manage contact submissions and admin users with a clean, responsive experience designed for business operations.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Enterprise-ready</p>
                <p className="mt-3 text-lg font-semibold text-white">Secure login</p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                <p className="text-sm text-slate-400">Mobile-first</p>
                <p className="mt-3 text-lg font-semibold text-white">Responsive layout</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8">
            <div className="mb-8 text-center">
              <p className="text-sm uppercase tracking-[0.35em] text-brand-300">Admin sign-in</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Welcome back</h2>
              <p className="mt-2 text-sm text-slate-400">Enter your credentials to continue to the dashboard.</p>
            </div>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-200">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-200">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="mt-3 w-full rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-brand-500 px-5 py-3 text-base font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            {error ? <p className="mt-5 text-center text-sm text-rose-300">{error}</p> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
