'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form-improved';

const pageToCollectionMap: Record<string, 'products' | 'services' | 'boutique' | 'news' | 'newsCategories' | 'boutiqueCategories'> = {
  'manage-products': 'products',
  'manage-services': 'services',
  'manage-boutique': 'boutique',
  'manage-boutique-categories': 'boutiqueCategories',
  'manage-news': 'news',
  'manage-news-categories': 'newsCategories',
};

export default function SiteCollectionCreatePage() {
  const params = useParams();
  const rawPage = params?.page;
  const pageKey = Array.isArray(rawPage) ? rawPage[0] : rawPage ?? '';
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const collectionName = pageToCollectionMap[pageKey];

  if (!collectionName) {
    return <div className="p-6 text-slate-700">Unsupported management page.</div>;
  }

  return <AtlanticDunesForm collectionName={collectionName} mode="create" siteName={siteName} />;
}
