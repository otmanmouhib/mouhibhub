'use client';

import { useEffect, useState } from 'react';
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

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const siteName = params?.site ?? '';
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

      {children}
    </div>
  );
}
