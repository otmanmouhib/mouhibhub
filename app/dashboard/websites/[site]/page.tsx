'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type SiteInfo = {
  db: string;
  label: string;
  url: string;
  status: string;
  contacts: number;
  reports: number;
  services: number;
  products: number;
  boutique: number;
  poles: number;
  domains: number;
  news: number;
  newsCategories: number;
  images: number;
  availableCollections: string[];
  lastSeen: string;
};

export default function SiteOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const siteName = params?.site ?? '';
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!siteName) return;

    async function loadSiteInfo() {
      try {
        const response = await fetchWithAuthRedirect(router, `/api/dashboard/websites/${siteName}`);
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Unable to load website details');
        }
        const data = await response.json();
        setSite(data.site);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }

    loadSiteInfo();
  }, [siteName, router]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-brand-200 bg-gradient-to-br from-white to-brand-50 p-8 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                  Website Overview
                </div>
                <h1 className="text-3xl font-semibold text-brand-900">{site?.label ?? params.site}</h1>
                <p className="mt-2 text-sm text-brand-700">Manage collections and administration tools</p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200/60 bg-emerald-50 px-4 py-2 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                <span className="text-sm font-medium text-emerald-700">{site?.status ?? 'Loading...'}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-brand-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Database</p>
                <p className="mt-3 text-2xl font-semibold text-brand-900">{site?.db ?? siteName}</p>
                <p className="mt-2 text-xs text-brand-600">Connected instance</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-blue-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Services</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.services ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Total items</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-purple-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Products</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.products ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Total items</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-amber-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Boutique</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.boutique ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Total items</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-emerald-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Poles</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.poles ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Business poles</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-cyan-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Domains</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.domains ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Category groups</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-rose-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">News</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.news ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Articles published</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-indigo-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Categories</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.newsCategories ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">News categories</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-lime-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Contacts</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.contacts ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Total records</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-pink-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Images</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.images ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Asset files</p>
              </div>
            </div>

            <div className="group relative overflow-hidden rounded-xl border border-brand-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
              <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-orange-500/5"></div>
              <div className="relative">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-700">Reports</p>
                <p className="mt-3 text-4xl font-semibold text-brand-900">{site?.reports ?? 0}</p>
                <p className="mt-2 text-xs text-brand-600">Total entries</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
