'use client';

import { useRouter } from 'next/navigation';

type DashboardHeaderProps = {
  onMenuToggle?: () => void;
};

export default function DashboardHeader({ onMenuToggle }: DashboardHeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="mb-8 overflow-hidden rounded-[2rem] border border-brand-200 bg-white p-6 shadow-sm shadow-brand-900/5">
      <div className="h-1 w-24 rounded-full bg-brand-500" />
      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-brand-200 bg-brand-50 text-brand-800 transition hover:border-brand-500 lg:hidden"
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-brand-500">Workspace access</p>
            <h2 className="mt-2 text-2xl font-semibold text-brand-900">Dashboard controls</h2>
            <p className="mt-2 text-sm text-brand-700">Logout when you finish to keep the console secure.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center rounded-2xl border border-brand-200 bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
