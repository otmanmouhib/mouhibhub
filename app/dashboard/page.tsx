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
    <div className="space-y-6">
      <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-white to-brand-50 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              Dashboard
            </div>
            <h1 className="text-3xl font-semibold text-brand-900">System Overview</h1>
            <p className="mt-2 text-sm text-brand-700">Monitor all websites and system health in real-time</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-brand-200 bg-white px-4 py-2 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-brand-900">Live</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5"></div>
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Websites</p>
            <p className="mt-3 text-4xl font-semibold text-brand-900">{stats?.websitesMonitored ?? '—'}</p>
            <p className="mt-2 text-xs text-brand-600">Monitored</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5"></div>
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Databases</p>
            <p className="mt-3 text-4xl font-semibold text-brand-900">{stats?.databases ?? '—'}</p>
            <p className="mt-2 text-xs text-brand-600">Connected</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5"></div>
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Contacts</p>
            <p className="mt-3 text-4xl font-semibold text-brand-900">{stats?.contacts ?? '—'}</p>
            <p className="mt-2 text-xs text-brand-600">Total records</p>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5"></div>
          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-wider text-brand-700">System</p>
            <p className="mt-3 text-2xl font-semibold text-emerald-600">{stats?.health ?? '—'}</p>
            <p className="mt-2 text-xs text-brand-600">All systems operational</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-900">Quick Actions</h2>
              <p className="mt-1 text-sm text-brand-700">Navigate to key sections</p>
            </div>
            <svg className="h-5 w-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="mt-4 space-y-2">
            <a href="/dashboard/websites" className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 transition-all duration-150 hover:border-brand-300 hover:bg-brand-100 hover:text-brand-900">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Manage Websites</span>
            </a>
            <a href="/dashboard/contacts" className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 transition-all duration-150 hover:border-brand-300 hover:bg-brand-100 hover:text-brand-900">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>View All Contacts</span>
            </a>
            <a href="/dashboard/users" className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800 transition-all duration-150 hover:border-brand-300 hover:bg-brand-100 hover:text-brand-900">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Manage Users</span>
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-brand-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-brand-900">System Status</h2>
              <p className="mt-1 text-sm text-brand-700">Real-time health monitoring</p>
            </div>
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-brand-800">Database Connections</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">Active</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-brand-800">API Endpoints</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">Responding</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-brand-800">Website Monitoring</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
