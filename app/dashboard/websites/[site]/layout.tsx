'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const router = useRouter();

  const breadcrumbs = useMemo(() => {
    const pageLabels: Record<string, string> = {
      'manage-products': 'Produits',
      'manage-services': 'Services',
      'manage-boutique': 'Boutique',
      'manage-gallery': 'Galerie',
      'manage-entreprise-informations': 'Entreprise',
      'manage-contact-submissions': 'Contact Submissions',
      'manage-news': 'Actualites',
      'manage-news-categories': 'Categories Actualites',
      'manage-boutique-categories': 'Categories Boutique',
      'manage-poles-domains': 'Poles & Domains',
      'manage-report-tickets': 'Report Tickets',
      reports: 'Reports',
      users: 'Users',
      contacts: 'Contacts',
      new: 'New',
    };

    const items: Array<{ label: string; href?: string }> = [
      { label: 'Accueil', href: '/dashboard' },
      { label: 'Websites', href: '/dashboard/websites' },
    ];

    if (!siteName) {
      return items;
    }

    items.push({
      label: siteInfo?.label ?? siteName,
      href: `/dashboard/websites/${encodeURIComponent(siteName)}`,
    });

    const pathParts = pathname.split('/').filter(Boolean);
    const tail = pathParts.slice(3);
    const progressiveParts = ['dashboard', 'websites', siteName];

    for (const part of tail) {
      progressiveParts.push(part);
      const decoded = decodeURIComponent(part);
      const label = pageLabels[decoded] ?? decoded.replace(/-/g, ' ');
      const isLastPathSegment = part === tail[tail.length - 1];

      items.push({
        label,
        href: isLastPathSegment ? undefined : `/${progressiveParts.join('/')}`,
      });
    }

    const filterLabels: Array<[string, string]> = [
      ['pole', 'Pole'],
      ['domain', 'Domain'],
      ['category', 'Category'],
      ['subcategory', 'Subcategory'],
    ];

    const query = new URLSearchParams();
    for (const [key, name] of filterLabels) {
      const value = searchParams.get(key);
      if (!value) continue;
      query.set(key, value);
      items.push({
        label: `${name}: ${value}`,
        href: `${pathname}?${query.toString()}`,
      });
    }

    return items;
  }, [pathname, searchParams, siteInfo?.label, siteName]);

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

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <nav className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
                {crumb.href && !isLast ? (
                  <Link href={crumb.href} className="transition-colors hover:text-slate-700">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className={isLast ? 'font-medium text-slate-700' : ''}>{crumb.label}</span>
                )}
                {!isLast ? <span className="text-slate-300">/</span> : null}
              </span>
            );
          })}
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{siteInfo?.label ?? siteName}</h1>
            <p className="mt-2 text-sm text-slate-600">Manage this website's available data collections and functional pages.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{siteInfo?.status ?? 'Loading...'}</div>
        </div>
      </div>

      {children}
    </div>
  );
}
