'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type DashboardStats = {
  websitesMonitored: number;
  databases: number;
  contacts: number;
  users: number;
  health: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchStats() {
      const response = await fetchWithAuthRedirect(router, '/api/dashboard/stats');
      if (response.status === 401) return;
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    }
    fetchStats();
  }, [router]);

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard Overview</h1>
            <p className="mt-2 text-sm text-slate-600">Monitor all websites, database connections, and overall system health from one place.</p>
          </div>
          <span className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Multi-site management</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Websites monitored</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.websitesMonitored ?? '...'}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Databases tracked</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.databases ?? '...'}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Total contacts</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.contacts ?? '...'}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">System health</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.health ?? '...'}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 lg:col-span-2">
          <h2 className="text-xl font-semibold text-slate-900">What to do next</h2>
          <p className="mt-3 text-sm text-slate-600">Use the Websites tab to pick a site and drill down into that website's contacts, report summaries, and operational details. Use Users to manage access across the admin portal.</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <h2 className="text-xl font-semibold text-slate-900">Live system status</h2>
          <p className="mt-3 text-sm text-slate-600">The dashboard aggregates multiple databases and reports the health of all monitored websites together.</p>
        </div>
      </div>
    </div>
  );
}
