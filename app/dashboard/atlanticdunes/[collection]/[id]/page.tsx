'use client';

import { useParams } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form';

export default function AtlanticDunesEditPage() {
  const params = useParams();
  const collectionName = Array.isArray(params?.collection) ? params.collection[0] : params?.collection ?? '';
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';

  return <AtlanticDunesForm collectionName={collectionName} mode="edit" itemId={itemId} />;
}
