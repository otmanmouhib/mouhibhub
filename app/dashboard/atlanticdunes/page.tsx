'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type CollectionSummary = {
  name: string;
  label: string;
  description: string;
  count: number;
};

export default function AtlanticDunesPage() {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchCollections() {
      try {
        const response = await fetchWithAuthRedirect(router, '/api/atlanticdunes?info=collections');
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Unable to load Atlantic Dunes collections');
        }
        const data = await response.json();
        setCollections(Array.isArray(data?.collections) ? data.collections : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    fetchCollections();
  }, []);

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-brand-200 bg-white p-6 shadow-sm shadow-brand-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-brand-900">Atlantic Dunes Collections</h2>
            <p className="mt-2 text-sm text-brand-700">Choose a collection to manage, then add or edit records from the next screen.</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.name}
              href={`/dashboard/atlanticdunes/${collection.name}`}
              className="group block rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-1 hover:border-brand-300"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{collection.label}</h3>
                  <p className="mt-2 text-sm text-slate-600">{collection.description}</p>
                </div>
                <span className="rounded-full bg-brand-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">
                  {collection.count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
