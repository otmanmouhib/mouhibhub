'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  source: string;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchContacts() {
      try {
        const response = await fetchWithAuthRedirect(router, '/api/contacts');
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }
        const data = await response.json();
        const sourceContacts = Array.isArray(data?.sources)
          ? data.sources.flatMap((source: any) =>
              Array.isArray(source.contacts)
                ? source.contacts.map((contact: any) => ({
                    id: String(contact._id),
                    name: contact.name,
                    email: contact.email,
                    message: contact.message,
                    source: source.db,
                  }))
                : [],
            )
          : [];
        setContacts(sourceContacts);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
      }
    }
    fetchContacts();
  }, []);

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-800">Contact Submissions</h1>
      <p className="text-sm text-gray-600">Review and manage all contact submissions received through the system.</p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={`${contact.source}-${contact.id}`}>
                <td className="px-6 py-4 text-sm text-gray-800">{contact.name}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{contact.email}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{contact.message}</td>
                <td className="px-6 py-4 text-sm text-gray-800">{contact.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
