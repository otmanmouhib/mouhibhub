'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function AtlanticDunesEditPage() {
  const params = useParams();
  const router = useRouter();
  const collectionName = Array.isArray(params?.collection) ? params.collection[0] : params?.collection ?? '';
  const itemId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const [jsonValue, setJsonValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const hint = useMemo(() => {
    if (collectionName === 'entrepriseInfo') {
      return 'Update the single enterprise contact document. The identifier is always main.';
    }
    return 'Edit the JSON document and preserve the _id or collection-specific identifier fields.';
  }, [collectionName]);

  useEffect(() => {
    if (!collectionName || !itemId) {
      return;
    }

    async function loadItem() {
      try {
        const response = await fetch(`/api/atlanticdunes/${collectionName}/${encodeURIComponent(itemId)}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to load document');
        }
        const data = await response.json();
        setJsonValue(JSON.stringify(data.document ?? {}, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [collectionName, itemId]);

  async function handleUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    try {
      const payload = JSON.parse(jsonValue);
      const response = await fetch(`/api/atlanticdunes/${collectionName}/${encodeURIComponent(itemId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to update document');
      }

      setMessage('Document updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this document permanently?')) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/atlanticdunes/${collectionName}/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to delete document');
      }
      router.push('/dashboard/atlanticdunes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (loading) {
    return <div className="p-6 text-slate-700">Loading document...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Edit {collectionName}</h2>
          <p className="mt-2 text-sm text-slate-600">Manage MongoDB content for Atlantic Dunes by editing the JSON payload.</p>
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 shadow-sm shadow-slate-900/5">
        <p className="font-semibold">Document hint</p>
        <p className="mt-2">{hint}</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label htmlFor="jsonEditor" className="block text-sm font-semibold text-slate-700">
            Document JSON
          </label>
          <textarea
            id="jsonEditor"
            value={jsonValue}
            onChange={(event) => setJsonValue(event.target.value)}
            rows={20}
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
            Save changes
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            Delete record
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
