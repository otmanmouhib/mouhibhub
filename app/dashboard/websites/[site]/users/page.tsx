'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type User = {
  id: string;
  email: string;
  role: string;
};

export default function WebsiteUsersPage() {
  const params = useParams();
  const siteName = params?.site ?? '';
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!siteName) return;

    async function fetchUsers() {
      try {
        const response = await fetchWithAuthRedirect(router, `/api/users?db=${siteName}`);
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error('Could not load users for this website');
        }
        const data = await response.json();
        setUsers(Array.isArray(data?.users) ? data.users.map((user: any) => ({ id: String(user._id), email: user.email, role: user.role ?? 'Member' })) : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, [siteName]);

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <h1 className="text-2xl font-semibold text-slate-900">Users for {siteName}</h1>
        <p className="mt-2 text-sm text-slate-600">Manage user records stored in this website's database.</p>
      </div>

      {loading ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">Loading users...</div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">Error: {error}</div>
      ) : users.length === 0 ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">No users found for this website.</div>
      ) : (
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 text-sm text-slate-800">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-slate-800">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
