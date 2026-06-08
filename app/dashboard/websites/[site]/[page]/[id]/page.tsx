'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form-improved';

const pageToCollectionMap: Record<string, 'products' | 'services' | 'boutique' | 'news'> = {
  'manage-products': 'products',
  'manage-services': 'services',
  'manage-boutique': 'boutique',
  'manage-news': 'news',
};

export default function SiteCollectionEditPage() {
  const params = useParams();
  const rawPage = params?.page;
  const pageKey = Array.isArray(rawPage) ? rawPage[0] : rawPage ?? '';
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const collectionName = pageToCollectionMap[pageKey];
  const router = useRouter();

  useEffect(() => {
    if (pageKey === 'manage-news-categories') {
      router.replace(`/dashboard/websites/${siteName}/manage-news/${encodeURIComponent(itemId)}`);
    }
  }, [pageKey, router, siteName, itemId]);

  if (!collectionName || !itemId) {
    return <div className="p-6 text-slate-700">Unsupported management page or missing item identifier.</div>;
  }

  return <AtlanticDunesForm collectionName={collectionName} mode="edit" itemId={itemId} siteName={siteName} />;
}
