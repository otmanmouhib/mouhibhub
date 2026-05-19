'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardNav from '../../components/dashboard-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="lg:flex lg:items-stretch">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-72 h-screen transform border-r border-slate-200 bg-white p-6 shadow-lg shadow-slate-900/5 transition-transform duration-300 lg:h-screen lg:translate-x-0 lg:block overflow-y-auto ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-full flex-col justify-between">
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 shadow-sm">
                  <span>MBHUB</span>
                </div>
                <p className="text-sm text-slate-600">A unified, polished admin experience with clear light design.</p>
              </div>

              <nav className="space-y-2">
                <DashboardNav />
              </nav>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-3xl border border-brand-200 bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Logout
            </button>
          </div>
        </aside>

        {menuOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <div className="flex-1 lg:ml-72">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-100 p-2 text-slate-700 transition hover:border-brand-500"
              aria-label="Toggle sidebar"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <span className="text-sm font-semibold text-slate-900">MBHUB</span>
          </div>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
