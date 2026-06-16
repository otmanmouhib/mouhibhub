'use client';

import { useParams } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form-improved';

export default function ManagePoleCreatePage() {
  const params = useParams();
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';

  return <AtlanticDunesForm collectionName="poles" mode="create" siteName={siteName} />;
}
