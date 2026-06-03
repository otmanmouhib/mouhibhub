'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type WebsiteItem = {
  db: string;
  label: string;
  availableCollections: string[];
};

const items = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/contacts', label: 'Contacts' },
  { href: '/dashboard/users', label: 'Users' },
];

function buildSitePages(siteName: string, availableCollections: string[]) {
  return [
    { key: 'overview', label: 'Overview', href: `/dashboard/websites/${siteName}` },
    { key: 'manage-services', label: 'Manage services', href: `/dashboard/websites/${siteName}/manage-services` },
    { key: 'manage-products', label: 'Manage products', href: `/dashboard/websites/${siteName}/manage-products` },
    { key: 'manage-boutique', label: 'Manage boutique', href: `/dashboard/websites/${siteName}/manage-boutique` },
    { key: 'manage-news', label: 'Manage news', href: `/dashboard/websites/${siteName}/manage-news` },
    { key: 'manage-news-categories', label: 'Manage news categories', href: `/dashboard/websites/${siteName}/manage-news-categories` },
    { key: 'manage-gallery', label: 'Manage gallery', href: `/dashboard/websites/${siteName}/manage-gallery` },
    { key: 'manage-entreprise-informations', label: 'Manage entreprise informations', href: `/dashboard/websites/${siteName}/manage-entreprise-informations` },
    { key: 'manage-contact-submissions', label: 'Manage contact submissions', href: `/dashboard/websites/${siteName}/manage-contact-submissions` },
    { key: 'manage-report-tickets', label: 'Manage report tickets', href: `/dashboard/websites/${siteName}/manage-report-tickets` },
    ...(availableCollections.includes('contacts') ? [{ key: 'contacts', label: 'Contacts', href: `/dashboard/websites/${siteName}/contacts` }] : []),
    ...(availableCollections.includes('reports') ? [{ key: 'reports', label: 'Reports', href: `/dashboard/websites/${siteName}/reports` }] : []),
    ...(availableCollections.includes('users') ? [{ key: 'users', label: 'Users', href: `/dashboard/websites/${siteName}/users` }] : []),
  ];
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});
  const [sitesOpen, setSitesOpen] = useState(true);

  useEffect(() => {
    async function loadWebsites() {
      try {
        const response = await fetch('/api/dashboard/websites');
        if (!response.ok) return;
        const data = await response.json();
        setWebsites(Array.isArray(data?.websites) ? data.websites : []);
      } catch {
        setWebsites([]);
      }
    }

    loadWebsites();
  }, []);

  useEffect(() => {
    if (!pathname.startsWith('/dashboard/websites/')) return;
    const [, , siteName] = pathname.split('/');
    if (siteName) {
      setExpandedSites((current) => ({ ...current, [siteName]: true }));
    }
  }, [pathname]);

  const websiteGroups = useMemo(
    () =>
      websites.map((site) => ({
        ...site,
        pages: buildSitePages(site.db, site.availableCollections),
      })),
    [websites],
  );

  return (
    <nav className="space-y-2">
      {items.slice(0, 1).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
              active
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <div className="rounded-3xl bg-slate-50">
        <button
          type="button"
          onClick={() => setSitesOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
          aria-expanded={sitesOpen}
        >
          <span>Websites</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-4 w-4 transition-transform ${sitesOpen ? 'rotate-180' : 'rotate-0'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {sitesOpen && (
          <div className="space-y-2 border-t border-slate-200 px-2 py-3">
            {websiteGroups.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">Loading websites...</div>
            ) : (
              websiteGroups.map((site) => {
                const siteActive = pathname === `/dashboard/websites/${site.db}` || pathname.startsWith(`/dashboard/websites/${site.db}/`);
                const expanded = expandedSites[site.db] ?? siteActive;
                return (
                  <div key={site.db} className="rounded-3xl bg-white shadow-sm">
                    <button
                      type="button"
                      onClick={() => setExpandedSites((current) => ({ ...current, [site.db]: !expanded }))}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition ${
                        siteActive ? 'bg-brand-500 text-white' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>{site.label}</span>
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {expanded && (
                      <div className="space-y-1 border-t border-slate-200 px-2 py-2">
                        {site.pages.map((page) => {
                          const active = pathname === page.href;
                          return (
                            <Link
                              key={page.key}
                              href={page.href}
                              className={`block rounded-3xl px-4 py-2 text-sm transition ${
                                active
                                  ? 'bg-brand-500 text-white'
                                  : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
                              }`}
                            >
                              {page.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {items.slice(1).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
              active
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/15'
                : 'text-slate-600 hover:bg-brand-50 hover:text-brand-700'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
