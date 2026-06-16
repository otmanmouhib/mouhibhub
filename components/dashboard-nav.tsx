'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type WebsiteItem = {
  db: string;
  label: string;
  availableCollections: string[];
};

type RelatedItem = {
  _id: string;
  slug?: string;
  label?: string;
  id?: string;
  subcategories?: Array<{ slug?: string; label?: string }>;
};

type PoleMeta = {
  value: string;
  label: string;
  domains: Array<{ value: string; label: string }>;
};

type CategoryMeta = {
  value: string;
  label: string;
  subcategories: Array<{ value: string; label: string }>;
};

type SiteMeta = {
  poles: PoleMeta[];
  boutiqueCategories?: CategoryMeta[];
  newsCategories?: CategoryMeta[];
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
    { key: 'manage-boutique-categories', label: 'Manage boutique categories', href: `/dashboard/websites/${siteName}/manage-boutique-categories` },
    { key: 'manage-poles-domains', label: 'Manage poles and domains', href: `/dashboard/websites/${siteName}/manage-poles-domains` },
    { key: 'manage-news-categories', label: 'Manage news categories', href: `/dashboard/websites/${siteName}/manage-news-categories` },
    { key: 'manage-gallery', label: 'Manage gallery', href: `/dashboard/websites/${siteName}/manage-gallery` },
    { key: 'manage-entreprise-informations', label: 'Manage entreprise informations', href: `/dashboard/websites/${siteName}/manage-entreprise-informations` },
    { key: 'manage-contact-submissions', label: 'Manage contact submissions', href: `/dashboard/websites/${siteName}/manage-contact-submissions` },
    { key: 'manage-report-tickets', label: 'Manage report tickets', href: `/dashboard/websites/${siteName}/manage-report-tickets` },
    ...(availableCollections.includes('reports') ? [{ key: 'reports', label: 'Reports', href: `/dashboard/websites/${siteName}/reports` }] : []),
    ...(availableCollections.includes('users') ? [{ key: 'users', label: 'Users', href: `/dashboard/websites/${siteName}/users` }] : []),
  ];
}

export default function DashboardNav() {
  const pathname = usePathname();
  const [websites, setWebsites] = useState<WebsiteItem[]>([]);
  const [expandedSites, setExpandedSites] = useState<Record<string, boolean>>({});
  const [expandedPageSubmenus, setExpandedPageSubmenus] = useState<Record<string, boolean>>({});
  const [expandedPoleSubmenus, setExpandedPoleSubmenus] = useState<Record<string, boolean>>({});
  const [expandedCategorySubmenus, setExpandedCategorySubmenus] = useState<Record<string, boolean>>({});
  const [sitesOpen, setSitesOpen] = useState(true);
  const [siteMeta, setSiteMeta] = useState<Record<string, SiteMeta>>({});

  const searchParams = useSearchParams();

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
    if (!websites.length) return;

    async function loadSiteMeta() {
      const meta: Record<string, SiteMeta> = {};
      await Promise.all(
        websites.map(async (site) => {
          const shouldLoadPoles = site.availableCollections.includes('poles') || site.availableCollections.includes('domains');
          const poleItems: RelatedItem[] = [];
          const poleLookup = new Map<string, string>();
          const poleGroups = new Map<string, { label: string; domainMap: Map<string, string> }>();

          if (shouldLoadPoles) {
            try {
              const response = await fetch(`/api/${site.db}/related/poles`);
              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.items)) {
                  poleItems.push(...data.items.map((item: any) => ({ _id: String(item._id), slug: item.slug, label: item.label, id: item.id })));
                }
              }
            } catch {
              // ignore
            }

            poleItems.forEach((pole) => {
              const value = String(pole.slug ?? pole.id ?? pole._id);
              const label = pole.label ?? value;
              poleLookup.set(value, label);
              poleGroups.set(value, { label, domainMap: new Map() });
            });

            const domainLookup = new Map<string, string>();
            try {
              const response = await fetch(`/api/${site.db}/related/domains`);
              if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data.items)) {
                  data.items.forEach((item: any) => {
                    const value = String(item.slug ?? item.id ?? item._id);
                    const label = item.label ?? value;
                    domainLookup.set(value, label);
                  });
                }
              }
            } catch {
              // ignore
            }

            const fallbackCollections = ['services', 'products', 'boutiqueProducts', 'boutique'];
            await Promise.all(
              fallbackCollections.map(async (collectionName) => {
                if (!site.availableCollections.includes(collectionName)) return;
                try {
                  const response = await fetch(`/api/${site.db}/${collectionName}`);
                  if (!response.ok) return;
                  const data = await response.json();
                  const items = Array.isArray(data.items) ? data.items : [];
                  items.forEach((item: any) => {
                    const poleValue = item.pole || item.poleId || item.poleSlug;
                    const domainValue = item.domain || item.domainId || item.domainSlug;
                    if (typeof poleValue !== 'string' || !poleValue.trim()) return;
                    if (typeof domainValue !== 'string' || !domainValue.trim()) return;

                    const normalizedPole = poleValue.trim();
                    const normalizedDomain = domainValue.trim();
                    const poleLabel = poleLookup.get(normalizedPole) ?? normalizedPole;
                    const domainLabel = domainLookup.get(normalizedDomain) ?? normalizedDomain;

                    if (!poleGroups.has(normalizedPole)) {
                      poleGroups.set(normalizedPole, { label: poleLabel, domainMap: new Map() });
                    }

                    const group = poleGroups.get(normalizedPole);
                    group?.domainMap.set(normalizedDomain, domainLabel);
                  });
                } catch {
                  // ignore fallback errors
                }
              }),
            );
          }

          let categories: CategoryMeta[] = [];
          if (site.availableCollections.includes('boutiqueCategories')) {
            try {
              const response = await fetch(`/api/${site.db}/related/boutiqueCategories`);
              if (response.ok) {
                const data = await response.json();
                categories = Array.isArray(data.items)
                  ? data.items.map((item: any) => ({
                      value: String(item.slug ?? item._id),
                      label: String(item.label ?? item.slug ?? item._id),
                      subcategories: Array.isArray(item.subcategories)
                        ? item.subcategories.map((subcategory: any) => ({
                            value: String(subcategory.slug ?? subcategory.id ?? subcategory.label ?? ''),
                            label: String(subcategory.label ?? subcategory.slug ?? subcategory.id ?? ''),
                          }))
                        : [],
                    }))
                  : [];
              }
            } catch {
              // ignore
            }
          }

          let newsCategories: CategoryMeta[] = [];
          if (site.availableCollections.includes('newsCategories')) {
            try {
              const response = await fetch(`/api/${site.db}/related/newsCategories`);
              if (response.ok) {
                const data = await response.json();
                newsCategories = Array.isArray(data.items)
                  ? data.items.map((item: any) => ({
                      value: String(item.id ?? item._id),
                      label: String(item.label ?? item.id ?? item._id),
                      subcategories: Array.isArray(item.subcategories)
                        ? item.subcategories.map((subcategory: any) => ({
                            value: String(subcategory.slug ?? subcategory.id ?? subcategory.label ?? ''),
                            label: String(subcategory.label ?? subcategory.slug ?? subcategory.id ?? ''),
                          }))
                        : [],
                    }))
                  : [];
              }
            } catch {
              // ignore
            }
          }

          const poles = Array.from(poleGroups.entries()).map(([value, group]) => ({
            value,
            label: group.label,
            domains: Array.from(group.domainMap.entries()).map(([domainValue, domainLabel]) => ({ value: domainValue, label: domainLabel })),
          }));

          meta[site.db] = { poles, boutiqueCategories: categories, newsCategories };
        }),
      );
      setSiteMeta(meta);
    }

    loadSiteMeta();
  }, [websites]);

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
    <nav className="space-y-0.5">
      {items.slice(0, 1).map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
                : 'text-slate-700 hover:bg-slate-100/60 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}

      <div>
        <button
          type="button"
          onClick={() => setSitesOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-brand-800 transition-all duration-200 hover:bg-brand-50 hover:text-brand-900"
          aria-expanded={sitesOpen}
        >
          <span>Websites</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 text-brand-400 transition-transform duration-200 ${
              sitesOpen ? 'rotate-180' : 'rotate-0'
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {sitesOpen && (
          <div className="ml-3 mt-0.5 space-y-0.5 border-l border-slate-200/60 pl-2.5">
            {websiteGroups.length === 0 ? (
              <div className="px-3.5 py-2 text-xs text-brand-500">Loading websites...</div>
            ) : (
              websiteGroups.map((site) => {
                const siteActive = pathname === `/dashboard/websites/${site.db}` || pathname.startsWith(`/dashboard/websites/${site.db}/`);
                const expanded = expandedSites[site.db] ?? siteActive;
                return (
                  <div key={site.db}>
                    <button
                      type="button"
                      onClick={() => setExpandedSites((current) => ({ ...current, [site.db]: !expanded }))}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-all duration-200 ${
                        siteActive
                          ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
                          : 'text-brand-800 hover:bg-brand-50 hover:text-brand-900'
                      }`}
                    >
                      <span>{site.label}</span>
                      <svg
                        viewBox="0 0 24 24"
                        className={`h-3.5 w-3.5 flex-shrink-0 transition-transform duration-200 ${
                          expanded ? 'rotate-180' : 'rotate-0'
                        } ${siteActive ? 'text-white/70' : 'text-brand-400'}`}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {expanded && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-brand-200 pl-2.5">
                        {site.pages.map((page) => {
                          const active = pathname === page.href;
                          const hasDropdown = (
                            ((page.key === 'manage-products' || page.key === 'manage-services') && (siteMeta[site.db]?.poles?.length ?? 0) > 0)
                            || (page.key === 'manage-boutique' && (siteMeta[site.db]?.boutiqueCategories?.length ?? 0) > 0)
                            || (page.key === 'manage-news' && (siteMeta[site.db]?.newsCategories?.length ?? 0) > 0)
                          );
                          return (
                            <div key={page.key}>
                              <div className="flex items-center justify-between gap-2">
                                <Link
                                  href={page.href}
                                  className={`flex-1 rounded-lg px-3 py-1.5 text-[11px] font-medium leading-5 transition-all duration-150 ${
                                    active
                                      ? 'bg-brand-50 text-brand-700'
                                      : 'text-brand-700 hover:bg-brand-50/60 hover:text-brand-900'
                                  }`}
                                >
                                  {page.label}
                                </Link>

                                {hasDropdown ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const submenuKey = `${site.db}:${page.key}`;
                                      setExpandedPageSubmenus((current) => ({
                                        ...current,
                                        [submenuKey]: !current[submenuKey],
                                      }));
                                    }}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                    aria-expanded={expandedPageSubmenus[`${site.db}:${page.key}`] ? 'true' : 'false'}
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      className={`h-4 w-4 transition-transform duration-200 ${
                                        expandedPageSubmenus[`${site.db}:${page.key}`] ? 'rotate-180' : 'rotate-0'
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                  </button>
                                ) : null}
                              </div>

                              {(page.key === 'manage-products' || page.key === 'manage-services') && siteMeta[site.db] ? (
                                <div className="ml-10 mt-1 space-y-0.5">
                                  {expandedPageSubmenus[`${site.db}:${page.key}`] ? (
                                    <div className="space-y-0.5">
                                      {siteMeta[site.db].poles.length > 0 ? (
                                        siteMeta[site.db].poles.map((pole) => {
                                          const poleHref = `${page.href}?pole=${encodeURIComponent(pole.value)}`;
                                          const poleKey = `${site.db}:${page.key}:${pole.value}`;
                                          const poleOpen = expandedPoleSubmenus[poleKey];
                                          const poleActive = pathname === page.href && searchParams.get('pole') === pole.value && !searchParams.get('domain');
                                          return (
                                            <div key={`pole-${pole.value}`} className="space-y-0.5">
                                              <div className="flex items-center justify-between gap-2">
                                                <Link
                                                  href={poleHref}
                                                  className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                    poleActive
                                                      ? 'bg-brand-50 text-brand-700'
                                                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                  }`}
                                                >
                                                  {pole.label}
                                                </Link>
                                                {pole.domains.length > 0 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setExpandedPoleSubmenus((current) => ({
                                                        ...current,
                                                        [poleKey]: !current[poleKey],
                                                      }))
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                                    aria-expanded={poleOpen}
                                                  >
                                                    <svg
                                                      viewBox="0 0 24 24"
                                                      className={`h-4 w-4 transition-transform duration-200 ${poleOpen ? 'rotate-180' : 'rotate-0'}`}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2.5"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                  </button>
                                                ) : null}
                                              </div>
                                              {poleOpen && pole.domains.length > 0 ? (
                                                <div className="ml-3 space-y-0.5">
                                                  {pole.domains.map((domain) => {
                                                    const domainHref = `${page.href}?pole=${encodeURIComponent(pole.value)}&domain=${encodeURIComponent(domain.value)}`;
                                                    const domainActive = pathname === page.href && searchParams.get('domain') === domain.value;
                                                    return (
                                                      <Link
                                                        key={`domain-${pole.value}-${domain.value}`}
                                                        href={domainHref}
                                                        className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                          domainActive
                                                            ? 'bg-brand-50 text-brand-700'
                                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                        }`}
                                                      >
                                                        {domain.label}
                                                      </Link>
                                                    );
                                                  })}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">No poles available</div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {page.key === 'manage-boutique' && siteMeta[site.db]?.boutiqueCategories ? (
                                <div className="ml-10 mt-1 space-y-0.5">
                                  {expandedPageSubmenus[`${site.db}:${page.key}`] ? (
                                    <div className="space-y-0.5">
                                      {siteMeta[site.db]?.boutiqueCategories?.length ? (
                                        (siteMeta[site.db]?.boutiqueCategories ?? []).map((category) => {
                                          const categoryKey = `${site.db}:${page.key}:category:${category.value}`;
                                          const categoryHref = `${page.href}?category=${encodeURIComponent(category.value)}`;
                                          const categoryActive = pathname === page.href && searchParams.get('category') === category.value;
                                          const categoryOpen = expandedCategorySubmenus[categoryKey];
                                          return (
                                            <div key={`category-${category.value}`} className="space-y-0.5">
                                              <div className="flex items-center justify-between gap-2">
                                                <Link
                                                  href={categoryHref}
                                                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                    categoryActive
                                                      ? 'bg-brand-50 text-brand-700'
                                                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                  }`}
                                                >
                                                  {category.label}
                                                </Link>
                                                {category.subcategories.length > 0 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setExpandedCategorySubmenus((current) => ({
                                                        ...current,
                                                        [categoryKey]: !current[categoryKey],
                                                      }))
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                                    aria-expanded={categoryOpen ? 'true' : 'false'}
                                                  >
                                                    <svg
                                                      viewBox="0 0 24 24"
                                                      className={`h-4 w-4 transition-transform duration-200 ${
                                                        categoryOpen ? 'rotate-180' : 'rotate-0'
                                                      }`}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2.5"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                  </button>
                                                ) : null}
                                              </div>
                                              {categoryOpen && category.subcategories.length > 0 ? (
                                                <div className="ml-3 space-y-0.5">
                                                  {category.subcategories.map((subcategory) => {
                                                    const subcategoryHref = `${page.href}?category=${encodeURIComponent(category.value)}&subcategory=${encodeURIComponent(subcategory.value)}`;
                                                    const subcategoryActive = pathname === page.href && searchParams.get('subcategory') === subcategory.value;
                                                    return (
                                                      <Link
                                                        key={`subcategory-${category.value}-${subcategory.value}`}
                                                        href={subcategoryHref}
                                                        className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                          subcategoryActive
                                                            ? 'bg-brand-50 text-brand-700'
                                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                        }`}
                                                      >
                                                        {subcategory.label}
                                                      </Link>
                                                    );
                                                  })}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">No boutique categories available</div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              {page.key === 'manage-news' && siteMeta[site.db]?.newsCategories ? (
                                <div className="ml-10 mt-1 space-y-0.5">
                                  {expandedPageSubmenus[`${site.db}:${page.key}`] ? (
                                    <div className="space-y-0.5">
                                      {siteMeta[site.db]?.newsCategories?.length ? (
                                        (siteMeta[site.db]?.newsCategories ?? []).map((category) => {
                                          const categoryKey = `${site.db}:${page.key}:category:${category.value}`;
                                          const categoryHref = `${page.href}?category=${encodeURIComponent(category.value)}`;
                                          const categoryActive = pathname === page.href && searchParams.get('category') === category.value;
                                          const categoryOpen = expandedCategorySubmenus[categoryKey];
                                          return (
                                            <div key={`category-${category.value}`} className="space-y-0.5">
                                              <div className="flex items-center justify-between gap-2">
                                                <Link
                                                  href={categoryHref}
                                                  className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                    categoryActive
                                                      ? 'bg-brand-50 text-brand-700'
                                                      : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                  }`}
                                                >
                                                  {category.label}
                                                </Link>
                                                {category.subcategories.length > 0 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setExpandedCategorySubmenus((current) => ({
                                                        ...current,
                                                        [categoryKey]: !current[categoryKey],
                                                      }))
                                                    }
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                                                    aria-expanded={categoryOpen ? 'true' : 'false'}
                                                  >
                                                    <svg
                                                      viewBox="0 0 24 24"
                                                      className={`h-4 w-4 transition-transform duration-200 ${
                                                        categoryOpen ? 'rotate-180' : 'rotate-0'
                                                      }`}
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2.5"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <polyline points="6 9 12 15 18 9" />
                                                    </svg>
                                                  </button>
                                                ) : null}
                                              </div>
                                              {categoryOpen && category.subcategories.length > 0 ? (
                                                <div className="ml-3 space-y-0.5">
                                                  {category.subcategories.map((subcategory) => {
                                                    const subcategoryHref = `${page.href}?category=${encodeURIComponent(category.value)}&subcategory=${encodeURIComponent(subcategory.value)}`;
                                                    const subcategoryActive = pathname === page.href && searchParams.get('subcategory') === subcategory.value;
                                                    return (
                                                      <Link
                                                        key={`subcategory-${category.value}-${subcategory.value}`}
                                                        href={subcategoryHref}
                                                        className={`block rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                                                          subcategoryActive
                                                            ? 'bg-brand-50 text-brand-700'
                                                            : 'text-slate-700 hover:bg-slate-100/70 hover:text-slate-900'
                                                        }`}
                                                      >
                                                        {subcategory.label}
                                                      </Link>
                                                    );
                                                  })}
                                                </div>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div className="rounded-lg bg-white px-3 py-2 text-xs text-slate-500">No news categories available</div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
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
            className={`block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
              active
                ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white'
                : 'text-brand-800 hover:bg-brand-50 hover:text-brand-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
