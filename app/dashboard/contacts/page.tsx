'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type Contact = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMessage, setEditMessage] = useState('');

  const router = useRouter();

  function confirmWithToast(message: string) {
    return new Promise<boolean>((resolve) => {
      let settled = false;

      toast(message, {
        duration: 8000,
        action: {
          label: 'Confirm',
          onClick: () => {
            settled = true;
            resolve(true);
          },
        },
        cancel: {
          label: 'Cancel',
          onClick: () => {
            settled = true;
            resolve(false);
          },
        },
        onAutoClose: () => {
          if (!settled) {
            resolve(false);
          }
        },
      });
    });
  }

  async function fetchContacts() {
    setLoading(true);
    try {
      const response = await fetchWithAuthRedirect(router, '/api/contacts?db=mouhibhub');
      if (response.status === 401) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Failed to fetch contacts');
      }

      const data = await response.json();
      const mouhibhubSource = Array.isArray(data?.sources)
        ? data.sources.find((source: any) => source?.db === 'mouhibhub')
        : null;

      const sourceContacts = Array.isArray(mouhibhubSource?.contacts)
        ? mouhibhubSource.contacts.map((contact: any) => ({
            id: String(contact._id),
            name: String(contact.name ?? ''),
            email: String(contact.email ?? ''),
            message: String(contact.message ?? ''),
            createdAt: contact.createdAt ?? null,
            updatedAt: contact.updatedAt ?? null,
          }))
        : [];

      setContacts(sourceContacts);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
  }, []);

  function startEdit(contact: Contact) {
    setEditId(contact.id);
    setEditName(contact.name);
    setEditEmail(contact.email);
    setEditMessage(contact.message);
  }

  function cancelEdit() {
    setEditId(null);
    setEditName('');
    setEditEmail('');
    setEditMessage('');
  }

  async function handleCreateContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    try {
      const response = await fetchWithAuthRedirect(router, '/api/contacts?db=mouhibhub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          message: newMessage,
        }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to create contact');
      }

      setNewName('');
      setNewEmail('');
      setNewMessage('');
      toast.success('Contact created successfully.');
      await fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create contact');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateContact(contactId: string) {
    setUpdatingId(contactId);

    try {
      const response = await fetchWithAuthRedirect(router, `/api/contacts/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          message: editMessage,
        }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update contact');
      }

      toast.success('Contact updated successfully.');
      cancelEdit();
      await fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update contact');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteContact(contactId: string, contactName: string) {
    const confirmed = await confirmWithToast(`Delete contact ${contactName}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(contactId);

    try {
      const response = await fetchWithAuthRedirect(router, `/api/contacts/${contactId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete contact');
      }

      toast.success('Contact deleted successfully.');
      await fetchContacts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete contact');
    } finally {
      setDeletingId(null);
    }
  }

  function formatDate(value?: string | null) {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString();
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Contact Submissions</h1>
        <p className="text-sm text-gray-600">Review and manage contact submissions from the mouhibhub database only.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Create contact</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-4" onSubmit={handleCreateContact}>
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <input
            type="text"
            placeholder="Message"
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create contact'}
          </button>
        </form>
      </section>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>Loading contacts...</td>
              </tr>
            ) : contacts.length === 0 ? (
              <tr>
                <td className="px-6 py-4 text-sm text-gray-500" colSpan={6}>No contacts found.</td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const isEditing = editId === contact.id;

                return (
                  <tr key={contact.id}>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                        />
                      ) : (
                        contact.name
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(event) => setEditEmail(event.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                        />
                      ) : (
                        contact.email
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editMessage}
                          onChange={(event) => setEditMessage(event.target.value)}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                        />
                      ) : (
                        contact.message
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600">{formatDate(contact.createdAt)}</td>
                    <td className="px-6 py-4 text-xs text-gray-600">{formatDate(contact.updatedAt)}</td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {isEditing ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateContact(contact.id)}
                            disabled={updatingId === contact.id}
                            className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {updatingId === contact.id ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(contact)}
                            className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(contact.id, contact.name)}
                            disabled={deletingId === contact.id}
                            className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {deletingId === contact.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
