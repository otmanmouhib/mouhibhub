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
  'manage-news': {
    title: 'Manage news articles',
    description: 'Create, edit, and publish news articles for this website.',
  },
  'manage-news-categories': {
    title: 'Manage news categories',
    description: 'Create and organize news categories for articles.',
  },
  'manage-report-tickets': {
    title: 'Manage report tickets',
    description: 'Track and respond to report tickets raised by website users.',
  },
};

const collectionMap: Record<string, 'products' | 'services' | 'boutique' | 'news' | 'newsCategories'> = {
  'manage-products': 'products',
  'manage-services': 'services',
  'manage-boutique': 'boutique',
  'manage-news': 'news',
  'manage-news-categories': 'newsCategories',
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
  if (collection === 'newsCategories') return 'News category';
  if (collection === 'news') return 'News article';
  return 'Product';
}

function collectionDescription(collection: string) {
  if (collection === 'services') return 'Service entries for your website.';
  if (collection === 'boutique') return 'Boutique products and boutique-specific content.';
  if (collection === 'newsCategories') return 'Categories used to organize news articles.';
  if (collection === 'news') return 'News articles and announcements published on the website.';
  return 'Product listings with pricing and categories.';
}

export default function SiteManagementPage() {
  const params = useParams();
  const router = useRouter();
  const rawPage = params?.page;
  const pageKey = Array.isArray(rawPage) ? rawPage.join('/') : rawPage ?? '';
  const siteName = Array.isArray(params?.site) ? params.site[0] : params?.site ?? '';
  const supportedSites = useMemo(() => ['atlanticdunes', 'adrobiofarm'] as const, []);
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
  const [categoryMap, setCategoryMap] = useState<RelatedMap>({});
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
      if (collection === 'news') {
        loadRelated('newsCategories', setCategoryMap, 'label');
      }
      if (['products', 'services', 'boutique'].includes(collection)) {
        loadRelated('poles', setPoleMap, 'label');
        loadRelated('domains', setDomainMap, 'label');
      }
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
    if (collectionType === 'news') {
      return item.status ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600">{item.status}</span> : null;
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

    if (collectionType === 'news') {
      return (
        <div className="grid gap-3">
          <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Summary</p>
            <p className="mt-2">{item.summary ?? item.excerpt ?? 'No summary available.'}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {item.date ? (
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Display date</p>
                <p className="mt-2">{new Date(item.date).toLocaleDateString()}</p>
              </div>
            ) : null}
            {item.publishedAt ? (
              <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Published at</p>
                <p className="mt-2">{new Date(item.publishedAt).toLocaleDateString()}</p>
              </div>
            ) : null}
          </div>
          {item.categoryId ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Category</p>
              <p className="mt-2">{categoryMap[item.categoryId] ?? item.categoryId}</p>
            </div>
          ) : null}
          {Array.isArray(item.tags) && item.tags.length > 0 ? (
            <div className="rounded-3xl bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Tags</p>
              <p className="mt-2">{item.tags.join(', ')}</p>
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
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                Gallery Management
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Gallery Images</h1>
              <p className="mt-2 text-sm text-slate-500">Upload and organize gallery images for {siteName}</p>
            </div>
            {!loading && !error && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2 shadow-sm">
                <span className="text-sm font-medium text-slate-700">{galleryImages.length} {galleryImages.length === 1 ? 'Image' : 'Images'}</span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <label className="block text-sm font-medium text-slate-900">Upload gallery images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => setGalleryFiles(event.target.files)}
                className="mt-3 block w-full rounded-lg border border-slate-200/60 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-700 shadow-sm transition-colors file:mr-4 file:rounded-lg file:border-0 file:bg-brand-500 file:px-4 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-brand-600 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button
              type="button"
              disabled={!galleryFiles || galleryFiles.length === 0 || uploadingGallery}
              onClick={uploadGalleryImages}
              className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingGallery ? 'Uploading…' : 'Upload Images'}
            </button>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading gallery images...</p>
          </div>
        ) : galleryImages.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">No gallery images found</p>
            <p className="mt-1 text-xs text-slate-400">Upload images using the form above</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {galleryImages.map(renderGalleryCard)}
          </div>
        )}
      </div>
    );
  }

  if (isContacts) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                Contact Submissions
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Contact Management</h1>
              <p className="mt-2 text-sm text-slate-500">Review and manage contact form submissions from {siteName}</p>
            </div>
            {!loading && !error && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2 shadow-sm">
                <span className="text-sm font-medium text-slate-700">{contacts.length} {contacts.length === 1 ? 'Submission' : 'Submissions'}</span>
              </div>
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading contact submissions...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">No contact submissions found</p>
            <p className="mt-1 text-xs text-slate-400">New submissions will appear here</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200/60">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Message</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Phone</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60">
                {contacts.map((contact) => (
                  <tr key={contact._id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{contact.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.message}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{contact.phone ?? '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${contact.status === 'New' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-700 border border-slate-200/60'}`}>
                        {contact.status ?? 'New'}
                      </span>
                    </td>
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
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                Company Information
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">Enterprise Details</h1>
              <p className="mt-2 text-sm text-slate-500">Edit company profile and contact information for {siteName}</p>
            </div>
          </div>
        </section>

        {renderEnterpriseForm()}
      </div>
    );
  }

  if (collection && supportedSite) {
    return (
      <div className="space-y-6">
        <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
                {segmentLabel(collection)} Management
              </div>
              <h1 className="text-3xl font-semibold text-slate-900">{metadata?.title}</h1>
              <p className="mt-2 text-sm text-slate-500">{metadata?.description ?? collectionDescription(collection)}</p>
            </div>
            <Link
              href={`/dashboard/websites/${siteName}/${pageKey}/new`}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Create {segmentLabel(collection)}
            </Link>
          </div>
        </section>

        {error ? (
          <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-6 text-rose-700 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Error: {error}</span>
            </div>
          </div>
        ) : loading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading {collection}...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">No {collection} found</p>
            <p className="mt-1 text-xs text-slate-400">Use the button above to add a new {segmentLabel(collection).toLowerCase()}</p>
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
      <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-rose-900">Website not found</h1>
            <p className="mt-2 text-sm text-rose-700">The requested website is not supported or could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="rounded-xl border border-rose-200/60 bg-rose-50 p-8 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-rose-900">Page not found</h1>
            <p className="mt-2 text-sm text-rose-700">The requested management page does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              Website Management
            </div>
            <h1 className="text-3xl font-semibold text-slate-900">{metadata.title}</h1>
            <p className="mt-2 text-sm text-slate-500">{metadata.description}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
        <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 className="mt-4 text-lg font-medium text-slate-900">Ready for content</h2>
        <p className="mt-2 text-sm text-slate-500">Add your management UI, forms, tables, or reports for this section</p>
      </section>
    </div>
  );
}
