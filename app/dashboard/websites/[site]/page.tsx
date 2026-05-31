'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type SiteInfo = {
  db: string;
  label: string;
  url: string;
  status: string;
  contacts: number;
  reports: number;
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

    if (siteName === 'atlanticdunes') {
      router.replace('/dashboard/atlanticdunes');
      return;
    }

    async function loadSiteInfo() {
      try {
        const response = await fetch(`/api/dashboard/websites/${siteName}`, {
          credentials: 'include',
        });
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

  const pageActions = useMemo(
    () => [
      ...(site?.availableCollections.includes('contacts')
        ? [{ key: 'contacts', label: 'Contacts', href: `/dashboard/websites/${siteName}/contacts` }]
        : []),
      ...(site?.availableCollections.includes('reports')
        ? [{ key: 'reports', label: 'Reports', href: `/dashboard/websites/${siteName}/reports` }]
        : []),
      ...(site?.availableCollections.includes('users')
        ? [{ key: 'users', label: 'Users', href: `/dashboard/websites/${siteName}/users` }]
        : []),
    ],
    [site, siteName],
  );

  return (
    <div className="space-y-8 p-6">
      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">Error: {error}</div>
      ) : (
        <>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-brand-500">Website overview</p>
                <h1 className="mt-3 text-3xl font-semibold text-slate-900">{site?.label ?? params.site}</h1>
                <p className="mt-2 text-sm text-slate-600">Review the current collections and jump into the feature pages for this site.</p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{site?.status ?? 'Loading...'}</div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <h2 className="text-lg font-semibold text-slate-900">Database</h2>
              <p className="mt-2 text-sm text-slate-600">{site?.db ?? siteName}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
              <p className="mt-2 text-sm text-slate-600">{site?.contacts ?? 0}</p>
            </div>
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
              <h2 className="text-lg font-semibold text-slate-900">Reports</h2>
              <p className="mt-2 text-sm text-slate-600">{site?.reports ?? 0}</p>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900">Available pages</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {pageActions.map((action) => {
                const available = site?.availableCollections.includes(action.key) ?? true;
                return (
                  <Link
                    key={action.key}
                    href={available ? action.href : '#'}
                    className={`rounded-[1.5rem] border px-5 py-6 text-center text-sm font-semibold transition ${
                      available
                        ? 'border-brand-200 bg-brand-50 text-brand-700 hover:border-brand-300 hover:bg-brand-100'
                        : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                    }`}
                    aria-disabled={!available}
                  >
                    {action.label}
                    <div className="mt-2 text-xs font-normal text-slate-500">
                      {available ? 'Open page' : 'Not available'}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
