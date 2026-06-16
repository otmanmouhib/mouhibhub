'use client';

import { useParams } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form-improved';

export default function ManagePoleEditPage() {
  const params = useParams();
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

  if (!itemId) {
    return <div className="p-6 text-slate-700">Missing pole identifier.</div>;
  }

  return <AtlanticDunesForm collectionName="poles" mode="edit" itemId={itemId} siteName={siteName} />;
}
