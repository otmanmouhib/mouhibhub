'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
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

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const siteName = params?.site ?? '';
  const pathname = usePathname();
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (!siteName) return;

    async function loadSite() {
      const response = await fetchWithAuthRedirect(router, `/api/dashboard/websites/${siteName}`);
      if (response.status === 401) return;
      if (!response.ok) return;
      const data = await response.json();
      setSiteInfo(data.site ?? null);
    }

    loadSite();
  }, [siteName, router]);

  const basePath = `/dashboard/websites/${siteName}`;
  const tabs = useMemo(
    () => [
      { href: basePath, label: 'Overview', visible: true },
      { href: `${basePath}/manage-services`, label: 'Manage services', visible: true },
      { href: `${basePath}/manage-products`, label: 'Manage products', visible: true },
      { href: `${basePath}/manage-boutique`, label: 'Manage boutique', visible: true },
      { href: `${basePath}/manage-gallery`, label: 'Manage gallery', visible: true },
      { href: `${basePath}/manage-entreprise-informations`, label: 'Entreprise informations', visible: true },
      { href: `${basePath}/manage-contact-submissions`, label: 'Contact submissions', visible: true },
      { href: `${basePath}/manage-report-tickets`, label: 'Report tickets', visible: true },
      ...(siteName === 'atlanticdunes' ? [{ href: '/dashboard/atlanticdunes', label: 'Collections', visible: true }] : []),
      ...(siteInfo?.availableCollections.includes('contacts')
        ? [{ href: `${basePath}/contacts`, label: 'Contacts', visible: true }]
        : []),
      ...(siteInfo?.availableCollections.includes('reports')
        ? [{ href: `${basePath}/reports`, label: 'Reports', visible: true }]
        : []),
      ...(siteInfo?.availableCollections.includes('users')
        ? [{ href: `${basePath}/users`, label: 'Users', visible: true }]
        : []),
    ],
    [basePath, siteInfo, siteName],
  );

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{siteInfo?.label ?? siteName}</h1>
            <p className="mt-2 text-sm text-slate-600">Manage this website's available data collections and functional pages.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{siteInfo?.status ?? 'Loading...'}</div>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
        <nav className="flex flex-wrap gap-3">
          {tabs
            .filter((tab) => tab.visible)
            .map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                    active ? 'bg-brand-500 text-white' : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
        </nav>
      </div>

      {children}
    </div>
  );
}
