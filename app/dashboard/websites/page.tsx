'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    async function fetchWebsites() {
      try {
        const response = await fetch('/api/dashboard/websites', {
          credentials: 'include',
        });

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
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Available Websites</h1>
            <p className="mt-2 text-sm text-slate-600">Browse monitored sites and open the site-specific management pages for reports, contacts, and users.</p>
          </div>
          <span className="inline-flex rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">Website-specific pages</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
        ) : websites.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">Loading available websites...</div>
        ) : (
          websites.map((website) => (
            <Link
              key={website.db}
              href={website.db === 'atlanticdunes' ? '/dashboard/atlanticdunes' : `/dashboard/websites/${website.db}`}
              className="group block rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{website.label}</h2>
                  <p className="mt-2 text-sm text-slate-600">{website.url}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{website.status}</span>
              </div>

              <div className="mt-5 grid gap-2 text-sm text-slate-600">
                <div>{website.contacts} contact records</div>
                <div>{website.reports} report entries</div>
                <div>{website.availableCollections.length} collections available</div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {website.availableCollections.map((collection) => (
                  <span key={collection} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                    {collection}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
