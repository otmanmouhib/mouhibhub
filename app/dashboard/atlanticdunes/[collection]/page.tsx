'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type AtlanticDunesItem = {
  _id: string;
  [key: string]: any;
};

export default function AtlanticDunesCollectionPage() {
  const params = useParams();
  const collectionName = Array.isArray(params?.collection) ? params.collection[0] : params?.collection ?? '';
  const [items, setItems] = useState<AtlanticDunesItem[]>([]);
  const [collectionLabel, setCollectionLabel] = useState<string>('');
  const [collectionDescription, setCollectionDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!collectionName) {
      return;
    }

    async function loadCollection() {
      try {
        const response = await fetch(`/api/atlanticdunes/${collectionName}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to load collection');
        }
        const data = await response.json();
        setItems(Array.isArray(data?.items) ? data.items : []);
        setCollectionLabel(data?.label ?? collectionName);
        setCollectionDescription(data?.description ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    loadCollection();
  }, [collectionName]);

  const displayField = (item: AtlanticDunesItem) => {
    return item.title || item.label || item.slug || item.id || item._id;
  };

  if (!collectionName) {
    return <div className="p-6 text-slate-700">No collection selected.</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{collectionLabel}</h2>
            <p className="mt-2 text-sm text-slate-600">{collectionDescription}</p>
          </div>
          <Link
            href={`/dashboard/atlanticdunes/${collectionName}/new`}
            className="rounded-3xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            Create new {collectionLabel.slice(0, -1)}
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Identifier</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Summary</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item) => (
                <tr key={item._id}>
                  <td className="px-6 py-4 text-sm text-slate-900">{item._id}</td>
                  <td className="px-6 py-4 text-sm text-slate-700">{displayField(item)}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/dashboard/atlanticdunes/${collectionName}/${encodeURIComponent(item._id)}`}
                      className="rounded-full bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 ? (
            <div className="p-6 text-sm text-slate-600">No items found in this collection.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
