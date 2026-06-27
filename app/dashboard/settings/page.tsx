'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type Profile = {
  _id: string;
  email: string;
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingRegisterToggle, setSavingRegisterToggle] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerEnabled, setRegisterEnabled] = useState(false);

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

  const createdLabel = useMemo(() => {
    if (!profile?.createdAt) return '-';
    return new Date(profile.createdAt).toLocaleString();
  }, [profile?.createdAt]);

  const updatedLabel = useMemo(() => {
    if (!profile?.updatedAt) return '-';
    return new Date(profile.updatedAt).toLocaleString();
  }, [profile?.updatedAt]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      try {
        const [meResponse, settingsResponse] = await Promise.all([
          fetchWithAuthRedirect(router, '/api/users/me'),
          fetch('/api/settings/registration', { credentials: 'include' }),
        ]);

        if (meResponse.status === 401) return;

        if (!meResponse.ok) {
          const payload = await meResponse.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to load profile.');
        }

        const mePayload = await meResponse.json();
        const nextProfile = mePayload?.user as Profile | undefined;

        if (!nextProfile) {
          throw new Error('Profile not found.');
        }

        setProfile(nextProfile);
        setEmail(nextProfile.email);

        if (settingsResponse.ok) {
          const settingsPayload = await settingsResponse.json();
          setRegisterEnabled(Boolean(settingsPayload?.registerEnabled));
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load settings.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  async function handleProfileSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSavingProfile(true);

    try {
      const response = await fetchWithAuthRedirect(router, '/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update profile.');
      }

      setProfile(payload.user);
      setEmail(payload.user.email);
      setPassword('');
      toast.success('Profile updated successfully.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRegisterToggle(nextValue: boolean) {
    setRegisterEnabled(nextValue);
    setSavingRegisterToggle(true);

    try {
      const response = await fetchWithAuthRedirect(router, '/api/settings/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registerEnabled: nextValue }),
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to update registration setting.');
      }

      setRegisterEnabled(Boolean(payload?.registerEnabled));
      toast.success('Registration visibility updated.');
    } catch (error) {
      setRegisterEnabled(!nextValue);
      toast.error(error instanceof Error ? error.message : 'Failed to update registration setting.');
    } finally {
      setSavingRegisterToggle(false);
    }
  }

  async function handleDeleteAccount() {
    const shouldDelete = await confirmWithToast('Delete your account permanently? This cannot be undone.');
    if (!shouldDelete) return;

    setDeleting(true);

    try {
      const response = await fetchWithAuthRedirect(router, '/api/users/me', {
        method: 'DELETE',
      });

      if (response.status === 401) return;

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || 'Failed to delete account.');
      }

      toast.success('Account deleted.');
      router.push('/login');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your profile information and access controls.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="mt-1 text-sm text-slate-500">Update your email and password.</p>

        <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="profile-email" className="text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </div>

            <div>
              <label htmlFor="profile-password" className="text-sm font-medium text-slate-700">
                New password
              </label>
              <div className="relative mt-2">
                <input
                  id="profile-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  placeholder="Leave empty to keep current password"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 pr-11 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 inline-flex items-center pr-3 text-slate-500 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
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
            </div>
          </div>

          <div className="grid gap-4 text-xs text-slate-500 sm:grid-cols-2">
            <p>Role: <span className="font-semibold text-slate-700">{profile?.role ?? '-'}</span></p>
            <p>Created: <span className="font-semibold text-slate-700">{createdLabel}</span></p>
            <p>Last update: <span className="font-semibold text-slate-700">{updatedLabel}</span></p>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile ? 'Saving...' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Registration</h2>
        <p className="mt-1 text-sm text-slate-500">Control whether the register button appears on the home page.</p>

        <label className="mt-5 flex items-center gap-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={registerEnabled}
            onChange={(event) => handleRegisterToggle(event.target.checked)}
            disabled={savingRegisterToggle}
            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-400"
          />
          Activate register
        </label>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-rose-800">Danger zone</h2>
        <p className="mt-1 text-sm text-rose-700">Delete your account permanently.</p>
        <button
          type="button"
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="mt-4 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? 'Deleting...' : 'Delete my account'}
        </button>
      </section>
    </div>
  );
}
