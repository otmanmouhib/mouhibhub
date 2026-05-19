'use client';

import { useEffect, useState } from 'react';

type DashboardStats = {
  contacts: number;
  users: number;
  health: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard Overview</h1>
            <p className="mt-2 text-sm text-slate-600">Welcome to the MBHUB admin dashboard. Here you can monitor key metrics and manage your system efficiently.</p>
          </div>
          <span className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Brand-aligned light experience</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Total Contacts</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.contacts ?? '...'}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">Total Users</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.users ?? '...'}</p>
        </div>
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-500">System Health</p>
          <p className="mt-4 text-4xl font-semibold text-slate-900">{stats?.health ?? '...'}</p>
        </div>
      </div>
    </div>
  );
}
