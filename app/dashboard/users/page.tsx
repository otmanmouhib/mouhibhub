'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type User = {
  id: string;
  email: string;
  role: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetchWithAuthRedirect(router, '/api/users');
        if (response.status === 401) return;

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to fetch users');
        }

        const data = await response.json();
        setUsers(Array.isArray(data?.users) ? data.users : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
    fetchUsers();
  }, []);

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
      <p className="text-sm text-gray-600">Manage all users with access to the admin dashboard.</p>

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={`${user.id ?? index}-${user.email ?? 'unknown'}-${index}`}>
                  <td className="px-6 py-4 text-sm text-gray-800">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-800">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
