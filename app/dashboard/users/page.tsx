'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type User = {
  _id: string;
  email: string;
  role: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newRole, setNewRole] = useState('pending');

  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editRole, setEditRole] = useState('pending');

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

  async function fetchUsers() {
    setLoading(true);
    try {
      const response = await fetchWithAuthRedirect(router, '/api/users');
      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to fetch users');
      }

      setUsers(Array.isArray(payload?.users) ? payload.users : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  function startEdit(user: User) {
    setEditUserId(user._id);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword('');
    setShowEditPassword(false);
  }

  function cancelEdit() {
    setEditUserId(null);
    setEditEmail('');
    setEditRole('pending');
    setEditPassword('');
    setShowEditPassword(false);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);

    try {
      const response = await fetchWithAuthRedirect(router, '/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to create user');
      }

      setNewEmail('');
      setNewPassword('');
      setShowNewPassword(false);
      setNewRole('pending');
      toast.success('User created successfully.');
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdateUser(userId: string) {
    setUpdatingId(userId);

    try {
      const response = await fetchWithAuthRedirect(router, `/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail,
          password: editPassword,
          role: editRole,
        }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update user');
      }

      toast.success('User updated successfully.');
      cancelEdit();
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDeleteUser(userId: string, email: string) {
    const confirmed = await confirmWithToast(`Delete user ${email}? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(userId);

    try {
      const response = await fetchWithAuthRedirect(router, `/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete user');
      }

      toast.success('User deleted successfully.');
      await fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete user');
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

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <p className="text-sm text-gray-600">CRUD users and manage roles in the mouhibhub database.</p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Create user</h2>
        <form className="mt-4 grid gap-4 md:grid-cols-4" onSubmit={handleCreateUser}>
          <input
            type="email"
            placeholder="Email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            required
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              placeholder="Password (min 8 chars)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((current) => !current)}
              className="absolute inset-y-0 right-0 inline-flex items-center pr-3 text-gray-500 transition hover:text-gray-700"
              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
            >
              {showNewPassword ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.92-2.18 2.44-4.07 4.34-5.47" />
                  <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                  <path d="M1 1l22 22" />
                  <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a10.92 10.92 0 0 1-3.08 4.36" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <select
            value={newRole}
            onChange={(event) => setNewRole(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          >
            <option value="pending">pending</option>
            <option value="admin">admin</option>
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? 'Creating...' : 'Create user'}
          </button>
        </form>
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700 shadow-sm">
          Error: {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>Loading users...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="px-6 py-4 text-sm text-gray-500" colSpan={5}>No users found.</td>
                </tr>
              ) : (
                users.map((user) => {
                  const isEditing = editUserId === user._id;
                  return (
                    <tr key={user._id}>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(event) => setEditEmail(event.target.value)}
                            className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                          />
                        ) : (
                          user.email
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {isEditing ? (
                          <select
                            value={editRole}
                            onChange={(event) => setEditRole(event.target.value)}
                            className="rounded-md border border-gray-300 px-2 py-1 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                          >
                            <option value="pending">pending</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          user.role
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-600">{formatDate(user.createdAt)}</td>
                      <td className="px-6 py-4 text-xs text-gray-600">{formatDate(user.updatedAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {isEditing ? (
                          <div className="space-y-2">
                            <div className="relative">
                              <input
                                type={showEditPassword ? 'text' : 'password'}
                                placeholder="New password (optional)"
                                value={editPassword}
                                onChange={(event) => setEditPassword(event.target.value)}
                                minLength={8}
                                className="w-full rounded-md border border-gray-300 px-2 py-1 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                              />
                              <button
                                type="button"
                                onClick={() => setShowEditPassword((current) => !current)}
                                className="absolute inset-y-0 right-0 inline-flex items-center pr-3 text-gray-500 transition hover:text-gray-700"
                                aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                              >
                                {showEditPassword ? (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.92-2.18 2.44-4.07 4.34-5.47" />
                                    <path d="M10.58 10.58a2 2 0 0 0 2.83 2.83" />
                                    <path d="M1 1l22 22" />
                                    <path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c5 0 9.27 3.89 11 8a10.92 10.92 0 0 1-3.08 4.36" />
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                )}
                              </button>
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleUpdateUser(user._id)}
                                disabled={updatingId === user._id}
                                className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {updatingId === user._id ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(user)}
                              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user._id, user.email)}
                              disabled={deletingId === user._id}
                              className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {deletingId === user._id ? 'Deleting...' : 'Delete'}
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
      )}
    </div>
  );
}
