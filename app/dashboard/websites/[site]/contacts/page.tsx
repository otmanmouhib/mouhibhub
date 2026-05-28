'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

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

  useEffect(() => {
    if (!siteName) return;

    async function fetchContacts() {
      try {
        const response = await fetch(`/api/contacts?db=${siteName}`, {
          credentials: 'include',
        });
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
    <div className="space-y-6 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-semibold text-slate-900">Contacts for {siteName}</h1>
        <p className="mt-2 text-sm text-slate-600">This page shows the contact records available in the selected site's database.</p>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">Loading contacts...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">Error: {error}</div>
      ) : contacts.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">No contacts found for this website.</div>
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 text-sm text-slate-800">{contact.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{contact.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{contact.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
