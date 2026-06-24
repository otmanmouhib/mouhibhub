'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';

type PoleItem = {
  _id: string;
  slug?: string;
  label?: string;
  shortDescription?: string;
  domains?: Array<{ slug?: string; label?: string; description?: string }>;
  productDomains?: Array<{ slug?: string; label?: string; description?: string }>;
  serviceDomains?: Array<{ slug?: string; label?: string; description?: string }>;
  createdAt?: string;
  updatedAt?: string;
};

type SiteApiResponse = {
  items: Array<PoleItem>;
};

export default function ManagePolesAndDomainsPage() {
  const params = useParams();
  const router = useRouter();
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const apiPrefix = `/api/${siteName}`;
  const [poles, setPoles] = useState<PoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/poles`);
      if (response.status === 401) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to load poles');
      }
      const data: SiteApiResponse = await response.json();
      setPoles(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load poles.');
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, router]);

  useEffect(() => {
    if (!siteName) return;
    loadPoles();
  }, [siteName, loadPoles]);

  const handleDelete = useCallback(
    async (itemId: string) => {
      if (!itemId || !confirm('Delete this pole? This cannot be undone.')) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetchWithAuthRedirect(router, `${apiPrefix}/poles/${encodeURIComponent(itemId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.status === 401) return;
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Unable to delete pole');
        }
        setPoles((current) => current.filter((item) => item._id !== itemId));
        toast.success('Pole deleted.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to delete pole.');
      } finally {
        setLoading(false);
      }
    },
    [apiPrefix, router],
  );

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              Poles & Domains Management
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">Manage poles and domains</h1>
            <p className="mt-2 text-sm text-slate-500">CRUD poles and their nested domains for the {siteName} website.</p>
          </div>
          <Link
            href={`/dashboard/websites/${siteName}/manage-poles-domains/new`}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
          >
            Add pole
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Poles</h2>
            <p className="mt-1 text-sm text-slate-500">Each pole can include separate product and service domain lists, or legacy nested domains.</p>
          </div>
          <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {poles.length} {poles.length === 1 ? 'pole' : 'poles'}
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>
        ) : loading ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">Loading poles…</div>
        ) : poles.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm text-slate-600">No poles found. Add a pole to manage its domains.</div>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {poles.map((pole) => (
              <article key={pole._id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pole</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{pole.label ?? pole.slug ?? pole._id}</h3>
                    {pole.shortDescription ? <p className="mt-2 text-sm text-slate-600">{pole.shortDescription}</p> : null}
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Product domains</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{Array.isArray(pole.productDomains) ? pole.productDomains.length : Array.isArray(pole.domains) ? pole.domains.length : 0}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Service domains</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{Array.isArray(pole.serviceDomains) ? pole.serviceDomains.length : Array.isArray(pole.domains) ? pole.domains.length : 0}</p>
                      </div>
                    </div>

                    {((Array.isArray(pole.productDomains) && pole.productDomains.length > 0) || (Array.isArray(pole.serviceDomains) && pole.serviceDomains.length > 0) || (Array.isArray(pole.domains) && pole.domains.length > 0)) ? (
                      <div className="mt-4 space-y-4">
                        {Array.isArray(pole.productDomains) && pole.productDomains.length > 0 ? (
                          <div>
                            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-500">Product domains</p>
                            <div className="space-y-3">
                              {pole.productDomains.map((domain, index) => (
                                <div key={`${pole._id}-product-domain-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">{domain.label ?? domain.slug ?? `Domain ${index + 1}`}</p>
                                    <span className="text-xs text-slate-500">{domain.slug ?? 'unnamed'}</span>
                                  </div>
                                  {domain.description ? <p className="mt-2 text-sm text-slate-600">{domain.description}</p> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {Array.isArray(pole.serviceDomains) && pole.serviceDomains.length > 0 ? (
                          <div>
                            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-500">Service domains</p>
                            <div className="space-y-3">
                              {pole.serviceDomains.map((domain, index) => (
                                <div key={`${pole._id}-service-domain-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">{domain.label ?? domain.slug ?? `Domain ${index + 1}`}</p>
                                    <span className="text-xs text-slate-500">{domain.slug ?? 'unnamed'}</span>
                                  </div>
                                  {domain.description ? <p className="mt-2 text-sm text-slate-600">{domain.description}</p> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {Array.isArray(pole.domains) && pole.domains.length > 0 ? (
                          <div>
                            <p className="mb-3 text-xs uppercase tracking-[0.24em] text-slate-500">Legacy domains</p>
                            <div className="space-y-3">
                              {pole.domains.map((domain, index) => (
                                <div key={`${pole._id}-domain-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">{domain.label ?? domain.slug ?? `Domain ${index + 1}`}</p>
                                    <span className="text-xs text-slate-500">{domain.slug ?? 'unnamed'}</span>
                                  </div>
                                  {domain.description ? <p className="mt-2 text-sm text-slate-600">{domain.description}</p> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No domains defined yet. Edit the pole to add nested domains.</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/dashboard/websites/${siteName}/manage-poles-domains/${encodeURIComponent(pole._id)}`}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit pole
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(pole._id)}
                      className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete pole
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
