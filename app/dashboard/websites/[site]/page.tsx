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

  const pageActions = useMemo(
    () => [
      ...(siteName === 'atlanticdunes'
        ? [{ key: 'collections', label: 'Collections', href: '/dashboard/atlanticdunes' }]
        : []),
      { key: 'manage-services', label: 'Manage services', href: `/dashboard/websites/${siteName}/manage-services` },
      { key: 'manage-products', label: 'Manage products', href: `/dashboard/websites/${siteName}/manage-products` },
      { key: 'manage-boutique', label: 'Manage boutique', href: `/dashboard/websites/${siteName}/manage-boutique` },
      { key: 'manage-gallery', label: 'Manage gallery', href: `/dashboard/websites/${siteName}/manage-gallery` },
      { key: 'manage-entreprise-informations', label: 'Manage entreprise informations', href: `/dashboard/websites/${siteName}/manage-entreprise-informations` },
      { key: 'manage-contact-submissions', label: 'Manage contact submissions', href: `/dashboard/websites/${siteName}/manage-contact-submissions` },
      { key: 'manage-report-tickets', label: 'Manage report tickets', href: `/dashboard/websites/${siteName}/manage-report-tickets` },
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
                <p className="mt-2 text-sm text-slate-600">Manage pages, collections, and other website-specific administration tools.</p>
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
            <h2 className="text-xl font-semibold text-slate-900">Available site pages</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageActions.map((action) => (
                <Link
                  key={action.key}
                  href={action.href}
                  className="rounded-[1.5rem] border border-slate-200 bg-white p-6 text-left text-sm font-semibold transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="text-slate-900">{action.label}</div>
                  <div className="mt-2 text-xs font-normal text-slate-500">
                    {action.label === 'Collections'
                      ? 'Browse database collections and manage records.'
                      : `Open the ${action.label.toLowerCase()} page for this website.`}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
