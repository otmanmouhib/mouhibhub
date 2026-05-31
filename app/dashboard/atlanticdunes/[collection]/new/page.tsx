'use client';

import { useParams } from 'next/navigation';
import AtlanticDunesForm from 'components/atlanticdunes-form';

export default function AtlanticDunesCreatePage() {
  const params = useParams();
  const collectionName = Array.isArray(params?.collection) ? params.collection[0] : params?.collection ?? '';

  return <AtlanticDunesForm collectionName={collectionName} mode="create" />;
}
