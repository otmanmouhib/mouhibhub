'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const fieldHints: Record<string, string> = {
  poles: 'slug, label, shortDescription',
  domains: 'slug, label, description',
  newsCategories: 'id, label, description',
  services:
    'slug, title, shortDescription, description, methodology (array), deliverable, poleId, domainId, optional status, featured, tags, imageId',
  products:
    'slug, title, shortDescription, description, specs (array of { label, value }), performance, poleId, domainId, pdfLink, optional imageId, galleryImageIds, unitPrice, currency',
  boutique:
    'slug, title, shortDescription, description, details (array), specs (array), price, availability, inStock, poleId, domainId, optional imageId, galleryImageIds',
  news:
    'slug, title, date, publishedAt, categoryId, summary, content (array), optional updatedAt, excerpt, author, tags, status, imageId',
  entrepriseInfo: 'email, phones (array), addressLines (array), optional fax',
};

export default function AtlanticDunesCreatePage() {
  const params = useParams();
  const router = useRouter();
  const collectionName = Array.isArray(params?.collection) ? params.collection[0] : params?.collection ?? '';
  const [jsonValue, setJsonValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(() => fieldHints[collectionName] || 'Define your JSON document and include an identifier field.', [collectionName]);

  useEffect(() => {
    if (collectionName === 'entrepriseInfo') {
      setJsonValue(JSON.stringify({ email: '', phones: [''], addressLines: [''] }, null, 2));
    } else {
      setJsonValue(JSON.stringify({ _id: '', slug: '', title: '', shortDescription: '' }, null, 2));
    }
  }, [collectionName]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const payload = JSON.parse(jsonValue);
      const response = await fetch(`/api/atlanticdunes/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to create document');
      }

      setMessage('Document created successfully. Redirecting...');
      const createdId = result?.document?._id;
      if (createdId) {
        router.push(`/dashboard/atlanticdunes/${collectionName}/${encodeURIComponent(createdId)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Create new {collectionName}</h2>
          <p className="mt-2 text-sm text-slate-600">Provide a JSON object for the new record. Required identifier fields vary by collection.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 shadow-sm shadow-slate-900/5">
          <p className="font-semibold">Field hint</p>
          <p className="mt-2">{hint}</p>
          <p className="mt-2 text-xs text-slate-500">Use _id or the collection-specific identifier field to create a stable record key.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="jsonInput" className="block text-sm font-semibold text-slate-700">
              Document JSON
            </label>
            <textarea
              id="jsonInput"
              value={jsonValue}
              onChange={(event) => setJsonValue(event.target.value)}
              rows={18}
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none shadow-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Error: {error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Create record
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
