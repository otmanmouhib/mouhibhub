'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';
import AtlanticDunesForm from 'components/atlanticdunes-form';

const pageMetadata: Record<string, { title: string; description: string }> = {
  'manage-services': {
    title: 'Manage services',
    description: 'Create, update, and organize service entries for this website.',
  },
  'manage-products': {
    title: 'Manage products',
    description: 'Manage product listings, pricing, and product details.',
  },
  'manage-boutique': {
    title: 'Manage boutique',
    description: 'Curate boutique items and manage boutique-specific content.',
  },
  'manage-gallery': {
    title: 'Manage gallery',
    description: 'Review and organize gallery images and media collections.',
  },
  'manage-entreprise-informations': {
    title: 'Manage entreprise informations',
    description: 'Edit the company profile, business details, and contact information.',
  },
  'manage-contact-submissions': {
    title: 'Manage contact submissions',
    description: 'Review incoming contact form submissions and follow up with visitors.',
  },
  'manage-report-tickets': {
    title: 'Manage report tickets',
    description: 'Track and respond to report tickets raised by website users.',
  },
};

const collectionMap: Record<string, 'products' | 'services' | 'boutique'> = {
  'manage-products': 'products',
  'manage-services': 'services',
  'manage-boutique': 'boutique',
};

type ItemRecord = {
  _id: string;
  slug?: string;
  title?: string;
  shortDescription?: string;
  description?: string;
  methodology?: string[];
  deliverable?: string;
  specs?: Array<{ label?: string; value?: string }>;
  details?: string[];
  performance?: string;
  pdfLink?: string;
  unitPrice?: number | string;
  price?: string;
  currency?: string;
  poleId?: string;
  domainId?: string;
  imageId?: string;
  availability?: string;
  inStock?: boolean;
  status?: string;
  featured?: boolean;
  [key: string]: any;
};

type ImageItem = { _id: string; filename: string };
type ContactRecord = { _id: string; name?: string; email?: string; message?: string; phone?: string; status?: string; createdAt?: string };

type RelatedMap = Record<string, string>;
type RelatedItem = { _id: string; label?: string; slug?: string; filename?: string };

function formatMoney(price: number | string | undefined, currency: string | undefined) {
  if (price === undefined || price === null || price === '') return '';
  const value = typeof price === 'number' ? price.toFixed(2) : String(price);
  return currency ? `${value} ${currency}` : value;
}

function segmentLabel(collection: string) {
  if (collection === 'services') return 'Service';
  if (collection === 'boutique') return 'Boutique item';
  return 'Product';
}

function collectionDescription(collection: string) {
  if (collection === 'services') return 'Service entries for your website.';
  if (collection === 'boutique') return 'Boutique products and boutique-specific content.';
  return 'Product listings with pricing and categories.';
}

export default function SiteManagementPage() {
  const params = useParams();
  const router = useRouter();
  const rawPage = params?.page;
  const pageKey = Array.isArray(rawPage) ? rawPage.join('/') : rawPage ?? '';
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const supportedSites = useMemo(() => ['atlanticdunes', 'adrobiofarm', 'mouhibhub'] as const, []);
  const supportedSite = useMemo(() => supportedSites.includes(siteName as typeof supportedSites[number]), [siteName, supportedSites]);
  const apiPrefix = useMemo(() => (siteName ? `/api/${siteName}` : '/api/atlanticdunes'), [siteName]);
  const metadata = useMemo(() => pageMetadata[pageKey], [pageKey]);
  const collection = useMemo(() => collectionMap[pageKey], [pageKey]);

  const isProducts = pageKey === 'manage-products';
  const isServices = pageKey === 'manage-services';
  const isBoutique = pageKey === 'manage-boutique';
  const isGallery = pageKey === 'manage-gallery';
  const isEnterprise = pageKey === 'manage-entreprise-informations';
  const isContacts = pageKey === 'manage-contact-submissions';

  const [items, setItems] = useState<ItemRecord[]>([]);
  const [imageMap, setImageMap] = useState<RelatedMap>({});
  const [poleMap, setPoleMap] = useState<RelatedMap>({});
  const [domainMap, setDomainMap] = useState<RelatedMap>({});
  const [galleryImages, setGalleryImages] = useState<ImageItem[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<FileList | null>(null);
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [enterpriseId, setEnterpriseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadRelated = useCallback(
    async (type: string, setMap: (map: RelatedMap) => void, labelField: 'label' | 'slug' | 'filename') => {
      if (!supportedSite) return;
      try {
        const response = await fetchWithAuthRedirect(router, `${apiPrefix}/related/${type}`);
        if (response.status === 401) return;
        if (!response.ok) return;
        const data = await response.json();
        const items = Array.isArray(data.items) ? (data.items as RelatedItem[]) : [];
        setMap(
          items.reduce<RelatedMap>((acc, item) => {
            const key = String(item._id);
            acc[key] = item[labelField] ?? item.slug ?? item.filename ?? key;
            return acc;
          }, {}),
        );
      } catch {
        // ignore relation load errors on this page
      }
    },
    [router, supportedSite, apiPrefix],
  );

  const loadItems = useCallback(async () => {
    if (!collection || !supportedSite) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/${collection}`);
      if (response.status === 401) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || `Unable to load ${collection}`);
      }
      const data = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred while loading items.');
    } finally {
      setLoading(false);
    }
  }, [collection, router, supportedSite, apiPrefix]);

  const loadGallery = useCallback(async () => {
    if (!supportedSite) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/related/images`);
      if (response.status === 401) return;
      if (!response.ok) {
        throw new Error('Unable to load gallery images');
      }
      const data = await response.json();
      setGalleryImages(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load gallery images.');
    } finally {
      setLoading(false);
    }
  }, [router, supportedSite, siteName]);

  const loadContacts = useCallback(async () => {
    if (!supportedSite) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuthRedirect(router, `/api/contacts?db=${encodeURIComponent(siteName)}`);
      if (response.status === 401) return;
      if (!response.ok) {
        throw new Error('Unable to load contact submissions');
      }
      const data = await response.json();
      const sourceContacts = Array.isArray(data?.sources) && data.sources.length > 0 && Array.isArray(data.sources[0].contacts)
        ? data.sources[0].contacts.map((contact: any) => ({
            _id: String(contact._id),
            name: contact.name,
            email: contact.email,
            message: contact.message,
            phone: contact.phone,
            status: contact.status,
            createdAt: contact.createdAt,
          }))
        : [];
      setContacts(sourceContacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load contact submissions.');
    } finally {
      setLoading(false);
    }
  }, [router, supportedSite, siteName]);

  const loadEnterprise = useCallback(async () => {
    if (!supportedSite) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/entrepriseInfo`);
      if (response.status === 401) return;
      if (!response.ok) {
        throw new Error('Unable to load entreprise information');
      }
      const data = await response.json();
      const first = Array.isArray(data.items) && data.items.length > 0 ? data.items[0] : null;
      setEnterpriseId(first?._id ? String(first._id) : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load entreprise information.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!supportedSite) return;
    if (collection) {
      loadItems();
      loadRelated('images', setImageMap, 'filename');
      loadRelated('poles', setPoleMap, 'label');
      loadRelated('domains', setDomainMap, 'label');
    }
    if (isGallery) {
      loadGallery();
    }
    if (isContacts) {
      loadContacts();
    }
    if (isEnterprise) {
      loadEnterprise();
    }
  }, [collection, isContacts, isEnterprise, isGallery, loadContacts, loadEnterprise, loadGallery, loadItems, loadRelated, supportedSite]);

  const handleDelete = useCallback(
    async (itemId: string) => {
      if (!collection || !confirm('Delete this item? This action cannot be undone.')) return;
      setDeletingId(itemId);

      try {
        const response = await fetchWithAuthRedirect(router, `${apiPrefix}/${collection}/${encodeURIComponent(itemId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.status === 401) return;
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Unable to delete item');
        }
        setItems((current) => current.filter((item) => item._id !== itemId));
        toast.success(`${segmentLabel(collection)} deleted.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to delete item.');
      } finally {
        setDeletingId(null);
      }
    },
    [collection, router, supportedSite, apiPrefix],
  );

  const uploadGalleryImages = useCallback(async () => {
    if (!galleryFiles || galleryFiles.length === 0) return;
    setUploadingGallery(true);
    setError(null);

    try {
      const formData = new FormData();
      Array.from(galleryFiles).forEach((file) => formData.append('images', file));
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images`, {
        method: 'POST',
        body: formData,
      } as RequestInit);
      if (response.status === 401) return;
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Unable to upload gallery images');
      }
      await loadGallery();
      setGalleryFiles(null);
      toast.success('Gallery images uploaded successfully.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to upload gallery images.');
    } finally {
      setUploadingGallery(false);
    }
  }, [galleryFiles, loadGallery, router]);

  const handleDeleteGalleryImage = useCallback(
    async (imageId: string) => {
      if (!confirm('Delete this image from the gallery?')) return;
      setDeletingId(imageId);

      try {
        const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images/${encodeURIComponent(imageId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (response.status === 401) return;
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Unable to delete gallery image');
        }
        setGalleryImages((current) => current.filter((image) => image._id !== imageId));
        toast.success('Gallery image deleted.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to delete gallery image.');
      } finally {
        setDeletingId(null);
      }
    },
    [router],
  );

  const renderMetadataBadge = (collectionType: string, item: ItemRecord) => {
    if (collectionType === 'services') {
      return item.status ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{item.status}</span> : null;
    }
    if (collectionType === 'boutique') {
      return item.availability ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{item.availability}</span> : null;
    }
    return item.unitPrice ? (
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">
        {formatMoney(item.unitPrice, item.currency)}
      </span>
    ) : null;
  };

  const renderItemDetails = (collectionType: string, item: ItemRecord) => {
    if (collectionType === 'services') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.isArray(item.methodology) && item.methodology.length > 0 ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Methodology</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {item.methodology.map((step, idx) => (
                  <li key={idx}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.deliverable ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Deliverable</p>
              <p className="mt-2">{item.deliverable}</p>
            </div>
          ) : null}
        </div>
      );
    }

    if (collectionType === 'boutique') {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.isArray(item.details) && item.details.length > 0 ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Details</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {item.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {item.inStock !== undefined ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Stock</p>
              <p className="mt-2">{item.inStock ? 'In stock' : 'Out of stock'}</p>
            </div>
          ) : null}
        </div>
      );
    }

    return Array.isArray(item.specs) && item.specs.length > 0 ? (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Specs</h3>
        <dl className="mt-3 space-y-2 text-sm text-slate-700">
          {item.specs.map((spec, index) => (
            <div key={index} className="grid gap-1 sm:grid-cols-[130px_1fr]">
              <dt className="font-semibold text-slate-900">{spec.label ?? 'Label'}</dt>
              <dd>{spec.value ?? '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    ) : null;
  };

  const renderItemCard = (item: ItemRecord) => (
    <article key={item._id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      {item.imageId ? (
        <img
          src={`${apiPrefix}/images/${encodeURIComponent(item.imageId)}`}
          alt={item.title ?? item.slug ?? 'Item image'}
          className="h-64 w-full object-cover"
        />
      ) : (
        <div className="flex h-64 items-center justify-center bg-slate-100 text-slate-500">No image available</div>
      )}

      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-brand-500">{item.slug}</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{item.title ?? `${segmentLabel(collection ?? '')} details`}</h2>
          </div>
          <div className="space-y-2 text-right">
            {renderMetadataBadge(collection ?? '', item)}
          </div>
        </div>

        {item.shortDescription ? <p className="text-sm text-slate-600">{item.shortDescription}</p> : null}
        {item.description ? <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">{item.description}</div> : null}

        <div className="grid gap-3 sm:grid-cols-2">
          {item.domainId ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Domain</p>
              <p className="mt-2 font-semibold text-slate-900">{domainMap[item.domainId] ?? item.domainId}</p>
            </div>
          ) : null}
          {item.poleId ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pole</p>
              <p className="mt-2 font-semibold text-slate-900">{poleMap[item.poleId] ?? item.poleId}</p>
            </div>
          ) : null}
        </div>

        {collection === 'products' && item.performance ? (
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Performance</p>
            <p className="mt-2 text-slate-900">{item.performance}</p>
          </div>
        ) : null}

        {renderItemDetails(collection ?? '', item)}

        {item.pdfLink ? (
          <a
            href={item.pdfLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-3xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
          >
            View PDF
          </a>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/dashboard/websites/${siteName}/${pageKey}/${encodeURIComponent(item._id)}`}
            className="rounded-3xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Edit
          </Link>
          <button
            type="button"
            disabled={deletingId === item._id}
            onClick={() => handleDelete(item._id)}
            className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId === item._id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );

  const renderGalleryCard = (image: ImageItem) => (
    <article key={image._id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <img
        src={`${apiPrefix}/images/${encodeURIComponent(image._id)}`}
        alt={image.filename}
        className="h-64 w-full object-cover"
      />
      <div className="flex flex-col gap-4 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Image</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{image.filename}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={deletingId === image._id}
            onClick={() => handleDeleteGalleryImage(image._id)}
            className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deletingId === image._id ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  );

  const renderEnterpriseForm = () => {
    if (loading) {
      return <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">Loading entreprise information…</div>;
    }

    if (error) {
      return <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>;
    }

    if (!enterpriseId) {
      return (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">
          No entreprise information record was found. Create it from the website collections area if needed.
        </div>
      );
    }

    return <AtlanticDunesForm collectionName="entrepriseInfo" mode="edit" itemId={enterpriseId} siteName={siteName} apiPrefix={apiPrefix} />;
  };

  if (isGallery) {
    return (
      <div className="space-y-8 p-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-500">Manage gallery</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Gallery images</h1>
              <p className="mt-2 text-sm text-slate-600">Upload, preview, and remove gallery images stored for {siteName}.</p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-sm font-semibold text-slate-900">Upload gallery images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => setGalleryFiles(event.target.files)}
                className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 shadow-sm focus:border-brand-300 focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!galleryFiles || galleryFiles.length === 0 || uploadingGallery}
              onClick={uploadGalleryImages}
              className="rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingGallery ? 'Uploading…' : 'Upload images'}
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
        ) : loading ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">Loading gallery images…</div>
        ) : galleryImages.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">No gallery images found.</div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-3">
            {galleryImages.map(renderGalleryCard)}
          </div>
        )}
      </div>
    );
  }

  if (isContacts) {
    return (
      <div className="space-y-8 p-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-500">Manage contact submissions</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Contact submissions</h1>
              <p className="mt-2 text-sm text-slate-600">Review inbound contact form submissions from {siteName}.</p>
            </div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
        ) : loading ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">Loading contact submissions…</div>
        ) : contacts.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">No contact submissions found for {siteName}.</div>
        ) : (
          <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {contacts.map((contact) => (
                  <tr key={contact._id}>
                    <td className="px-6 py-4 text-sm text-slate-800">{contact.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{contact.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{contact.message}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{contact.phone ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-slate-800">{contact.status ?? 'New'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  if (isEnterprise) {
    return (
      <div className="space-y-8 p-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-500">Manage entreprise informations</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">Entreprise information</h1>
              <p className="mt-2 text-sm text-slate-600">Edit the company contact and profile details for {siteName}.</p>
            </div>
          </div>
        </section>

        {renderEnterpriseForm()}
      </div>
    );
  }

  if (collection && supportedSite) {
    return (
      <div className="space-y-8 p-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-brand-500">{metadata?.title ?? 'Manage items'}</p>
              <h1 className="mt-3 text-3xl font-semibold text-slate-900">{metadata?.title}</h1>
              <p className="mt-2 text-sm text-slate-600">{metadata?.description ?? collectionDescription(collection)}</p>
            </div>
            <Link
              href={`/dashboard/websites/${siteName}/${pageKey}/new`}
              className="rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
            >
              Create {segmentLabel(collection)}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm shadow-rose-900/5">Error: {error}</div>
        ) : loading ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">Loading {collection}…</div>
        ) : items.length === 0 ? (
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-slate-600 shadow-sm shadow-slate-900/5">
            No {collection} found. Use the button above to add a new {segmentLabel(collection).toLowerCase()}.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            {items.map((item) => renderItemCard(item))}
          </div>
        )}
      </div>
    );
  }

  if (!siteName || !supportedSite) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <h1 className="text-2xl font-semibold">Website not found</h1>
        <p className="mt-2 text-sm">The requested website is not supported or could not be found.</p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm">The requested management page does not exist.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-brand-500">Website management</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">{metadata.title}</h1>
            <p className="mt-2 text-sm text-slate-600">{metadata.description}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <h2 className="text-xl font-semibold text-slate-900">This page is ready for content</h2>
        <p className="mt-3 text-sm text-slate-600">
          Add your management UI, forms, tables, or reports here for the selected website section.
        </p>
      </section>
    </div>
  );
}
