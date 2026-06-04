'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type WebsiteSummary = {
  db: string;
  label: string;
  url: string;
  status: string;
  contacts: number;
  reports: number;
  availableCollections: string[];
  lastSeen: string;
};

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<WebsiteSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchWebsites() {
      try {
        const response = await fetchWithAuthRedirect(router, '/api/dashboard/websites');
        if (response.status === 401) return;

        if (!response.ok) {
          throw new Error('Unable to load available websites');
        }

        const data = await response.json();
        setWebsites(Array.isArray(data?.websites) ? data.websites : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }

    fetchWebsites();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              Websites
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">Managed Websites</h1>
            <p className="mt-2 text-sm text-slate-500">Select a website to access collections and management tools</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2 shadow-sm">
            <span className="text-sm font-medium text-slate-700">{websites.length} {websites.length === 1 ? 'Site' : 'Sites'}</span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      ) : websites.length === 0 ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading websites...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {websites.map((website) => (
            <Link
              key={website.db}
              href={`/dashboard/websites/${website.db}`}
              className="group relative overflow-hidden rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-brand-300/60"
            >
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-brand-500/5 transition-transform duration-300 group-hover:scale-110"></div>
              
              <div className="relative">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">{website.label}</h2>
                    <p className="mt-1 text-sm text-slate-500">{website.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 ring-1 ring-inset ring-emerald-200/50">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-emerald-700">{website.status}</span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-500">Contacts</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{website.contacts}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-500">Reports</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{website.reports}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200/60 bg-slate-50/50 px-3 py-2">
                    <p className="text-xs font-medium text-slate-500">Collections</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{website.availableCollections.length}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-brand-600 group-hover:text-brand-700 transition-colors">
                  <span>Manage website</span>
                  <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
