'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
};

export default function WebsiteContactsPage() {
  const params = useParams();
  const siteName = params?.site ?? '';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!siteName) return;

    async function fetchContacts() {
      try {
        const response = await fetchWithAuthRedirect(router, `/api/contacts?db=${siteName}`);
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Could not load contacts for this website');
        }
        const data = await response.json();
        const siteContacts = Array.isArray(data?.sources) && data.sources[0]
          ? data.sources[0].contacts.map((contact: any) => ({
              id: String(contact._id),
              name: contact.name,
              email: contact.email,
              message: contact.message,
            }))
          : [];
        setContacts(siteContacts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchContacts();
  }, [siteName]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              Contacts
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">Contact Records</h1>
            <p className="mt-2 text-sm text-slate-500">View all contact submissions for {siteName}</p>
          </div>
          {!loading && !error && (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2 shadow-sm">
              <span className="text-sm font-medium text-slate-700">{contacts.length} {contacts.length === 1 ? 'Contact' : 'Contacts'}</span>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">Loading contacts...</p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
          <div className="flex items-center gap-3">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Error: {error}</span>
          </div>
        </div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
            <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-600">No contacts found</p>
          <p className="mt-1 text-xs text-slate-400">Contact submissions will appear here</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200/60">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 bg-white">
              {contacts.map((contact) => (
                <tr key={contact.id} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{contact.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{contact.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{contact.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
