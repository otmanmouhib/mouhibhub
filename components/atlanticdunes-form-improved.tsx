'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';
import {
  AtlanticDunesCollectionSchema,
  AtlanticDunesField,
  getCollectionSchema,
} from '../lib/atlanticdunes-schema';

type RelatedOption = { value: string; label: string; filename?: string; subcategories?: Array<{ slug: string; label: string; description?: string }> };
type RelatedOptions = Record<string, Array<RelatedOption>>;
type PoleDomainOption = { value: string; label: string; description?: string };
type PoleRelatedOption = RelatedOption & {
  domains?: PoleDomainOption[];
  productDomains?: PoleDomainOption[];
  serviceDomains?: PoleDomainOption[];
};
type UploadQueueItem = {
  id: string;
  file: File;
  filename: string;
  extension: string;
  label: string;
};

type Props = {
  collectionName: string;
  mode: 'create' | 'edit';
  itemId?: string;
  siteName?: string;
  apiPrefix?: string;
};

type FormData = Record<string, any>;

const DEFAULT_IMAGE_PAGE_SIZE = 9;
const SMALL_SCREEN_IMAGE_PAGE_SIZE = 3;

const collectionToManagePage: Record<string, string> = {
  products: 'manage-products',
  services: 'manage-services',
  boutique: 'manage-boutique',
  boutiqueCategories: 'manage-boutique-categories',
  news: 'manage-news',
  newsCategories: 'manage-news-categories',
};

function slugify(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getRecordSlug(formData: FormData) {
  return slugify(String(formData.title ?? formData.label ?? formData.slug ?? '')).replace(/^[-]+|[-]+$/g, '') || 'image';
}

function sanitizeFilename(value: string) {
  return value.replace(/[\\/]/g, '');
}

function getDynamicSubcategoryOptions(collectionName: string, formData: FormData, relatedOptions: RelatedOptions) {
  if (collectionName === 'boutique') {
    const category = String(formData.category ?? '').trim();
    if (!category) return [];
    const categoryOption = (relatedOptions.boutiqueCategories ?? []).find((option) => option.value === category || String((option as any).slug ?? option.value) === category);
    return categoryOption?.subcategories?.map((subcategory) => ({ value: subcategory.slug, label: subcategory.label })) ?? [];
  }

  if (collectionName === 'news') {
    const categoryId = String(formData.categoryId ?? '').trim();
    if (!categoryId) return [];
    const categoryOption = (relatedOptions.newsCategories ?? []).find((option) => option.value === categoryId || String((option as any).slug ?? option.value) === categoryId);
    return categoryOption?.subcategories?.map((subcategory) => ({ value: subcategory.slug, label: subcategory.label })) ?? [];
  }

  return [];
}

function getPoleValue(collectionName: string, formData: FormData) {
  if (!['products', 'services'].includes(collectionName)) return '';
  return String(formData.poleId ?? formData.pole ?? '').trim();
}

function isPoleScopedDomainField(collectionName: string, fieldName: string) {
  return ['products', 'services'].includes(collectionName) && ['domainId', 'domain'].includes(fieldName);
}

function normalizePoleDomains(domains: any[]): PoleDomainOption[] {
  return domains.reduce<PoleDomainOption[]>((acc, domain: any) => {
    const value = String(domain?.slug ?? domain?.id ?? domain?._id ?? domain?.label ?? domain ?? '').trim();
    if (!value) return acc;

    acc.push({
      value,
      label: String(domain?.label ?? domain?.slug ?? domain?.id ?? value),
      description: domain?.description ?? undefined,
    });

    return acc;
  }, []);
}

function getPoleScopedDomainOptions(
  collectionName: string,
  fieldName: string,
  formData: FormData,
  relatedOptions: RelatedOptions,
): PoleDomainOption[] | null {
  if (!isPoleScopedDomainField(collectionName, fieldName)) return null;

  const selectedPole = getPoleValue(collectionName, formData);
  if (!selectedPole) return [];

  const poles = (relatedOptions.poles ?? []) as PoleRelatedOption[];
  const selectedPoleOption = poles.find((option) => option.value === selectedPole);
  if (!selectedPoleOption) return [];

  const scopedDomains = collectionName === 'products'
    ? (selectedPoleOption.productDomains ?? selectedPoleOption.domains ?? [])
    : (selectedPoleOption.serviceDomains ?? selectedPoleOption.domains ?? []);

  const uniqueDomains = new Map<string, PoleDomainOption>();
  scopedDomains.forEach((domain) => {
    if (!domain?.value) return;
    if (!uniqueDomains.has(domain.value)) {
      uniqueDomains.set(domain.value, domain);
    }
  });

  return Array.from(uniqueDomains.values());
}

function getManagePageKey(collectionName: string) {
  return collectionToManagePage[collectionName] ?? collectionName;
}

function defaultValueForField(field: AtlanticDunesField) {
  switch (field.type) {
    case 'text':
    case 'slug':
    case 'textarea':
    case 'date':
      return '';
    case 'number':
      return '';
    case 'boolean':
      return false;
    case 'stringArray':
      return [''];
    case 'objectArray':
      return field.itemFields ? [field.itemFields.reduce<Record<string, any>>((acc, itemField) => ({ ...acc, [itemField.name]: '' }), {})] : [];
    case 'select':
      return '';
    case 'multiSelect':
      return [];
    default:
      return '';
  }
}

function normalizeValue(value: any, field: AtlanticDunesField) {
  if (value === undefined || value === null) {
    return defaultValueForField(field);
  }

  if (field.type === 'stringArray') {
    if (Array.isArray(value)) return value.length ? value : [''];
    if (typeof value === 'string') return [value];
    return [''];
  }

  if (field.type === 'objectArray') {
    if (Array.isArray(value)) return value.length ? value : [field.itemFields?.reduce((acc, item) => ({ ...acc, [item.name]: '' }), {})];
    return [field.itemFields?.reduce((acc, item) => ({ ...acc, [item.name]: '' }), {})];
  }

  if (field.type === 'boolean') {
    return Boolean(value);
  }

  return value;
}

// Helper to group fields into logical sections
function getFieldSections(fields: AtlanticDunesField[]): Array<{ name: string; label: string; fields: AtlanticDunesField[] }> {
  const basicFields = fields.filter(f => ['text', 'slug', 'date', 'number'].includes(f.type));
  const contentFields = fields.filter(f => ['textarea'].includes(f.type));
  const mediaFields = fields.filter(f => f.relation?.collection === 'images');
  const relationsFields = fields.filter((f) => ['select', 'multiSelect'].includes(f.type) && f.relation?.collection !== 'images');
  const domainFields = fields.filter((f) => ['productDomains', 'serviceDomains'].includes(f.name));
  const advancedFields = fields.filter(
    (f) => !basicFields.includes(f)
      && !contentFields.includes(f)
      && !relationsFields.includes(f)
      && !mediaFields.includes(f)
      && !domainFields.includes(f),
  );

  const sections = [];
  if (basicFields.length > 0) sections.push({ name: 'basic', label: '📋 Basic Info', fields: basicFields });
  if (contentFields.length > 0) sections.push({ name: 'content', label: '📝 Description', fields: contentFields });
  if (domainFields.length > 0) sections.push({ name: 'domains', label: '🗂️ Pole domains', fields: domainFields });
  if (mediaFields.length > 0) sections.push({ name: 'media', label: '🖼️ Images', fields: mediaFields });
  if (relationsFields.length > 0) sections.push({ name: 'relations', label: '🔗 Categories', fields: relationsFields });
  if (advancedFields.length > 0) sections.push({ name: 'advanced', label: '⚙️ Advanced', fields: advancedFields });

  return sections;
}

// Calculate form completion percentage
function getFormCompletion(formData: FormData, schema: AtlanticDunesCollectionSchema): number {
  const requiredFields = schema.fields.filter(f => f.required);
  if (requiredFields.length === 0) return 100;
  
  const filledFields = requiredFields.filter(f => {
    const value = formData[f.name];
    if (f.type === 'boolean') return typeof value === 'boolean';
    if (Array.isArray(value)) return value.length > 0 && value.some(v => v);
    return value && String(value).trim() !== '';
  });
  
  return Math.round((filledFields.length / requiredFields.length) * 100);
}

export default function AtlanticDunesForm({ collectionName, mode, itemId, siteName, apiPrefix: apiPrefixOverride }: Props) {
  const router = useRouter();
  const effectiveSiteName = siteName ?? 'atlanticdunes';
  const apiPrefix = apiPrefixOverride ?? `/api/${effectiveSiteName}`;
  const schema = getCollectionSchema(collectionName, effectiveSiteName);
  const [formData, setFormData] = useState<FormData>({});
  const [relatedOptions, setRelatedOptions] = useState<RelatedOptions>({});
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageSearch, setImageSearch] = useState('');
  const [imagePage, setImagePage] = useState(0);
  const [imagePageSize, setImagePageSize] = useState(DEFAULT_IMAGE_PAGE_SIZE);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageEdits, setImageEdits] = useState<Record<string, { filename: string; label: string }>>({});
  const [galleryOpen, setGalleryOpen] = useState<Record<string, boolean>>({});
  const [uploadQueues, setUploadQueues] = useState<Record<string, UploadQueueItem[]>>({});
  const [relationCreateOpen, setRelationCreateOpen] = useState<Record<string, boolean>>({});
  const [relationDrafts, setRelationDrafts] = useState<Record<string, { label: string; slug: string; description: string }>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const fieldSections = useMemo(() => {
    return schema ? getFieldSections(schema.fields) : [];
  }, [schema]);

  const formCompletion = useMemo(() => {
    return schema ? getFormCompletion(formData, schema) : 0;
  }, [formData, schema]);

  const relationCollections = useMemo(() => {
    if (!schema) return [];
    return Array.from(
      new Set(
        schema.fields
          .filter((field) => field.relation)
          .map((field) => field.relation!.collection),
      ),
    );
  }, [schema]);

  useEffect(() => {
    if (!schema) return;
    const defaults = schema.fields.reduce<FormData>((acc, field) => {
      acc[field.name] = normalizeValue(undefined, field);
      return acc;
    }, {});
    
    // Auto-generate dates for news when creating
    if (mode === 'create' && collectionName === 'news') {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      defaults.date = today;
      defaults.publishedAt = today;
    }
    
    setFormData(defaults);
    
    // Initialize all sections as collapsed
    const allCollapsed: Record<string, boolean> = {};
    fieldSections.forEach(section => {
      allCollapsed[section.name] = false;
    });
    setExpandedSections(allCollapsed);
  }, [schema, fieldSections, mode, collectionName]);

  useEffect(() => {
    setImagePage(0);
  }, [imageSearch]);

  useEffect(() => {
    function updatePageSize() {
      setImagePageSize(window.matchMedia('(max-width: 640px)').matches ? SMALL_SCREEN_IMAGE_PAGE_SIZE : DEFAULT_IMAGE_PAGE_SIZE);
    }

    updatePageSize();
    window.addEventListener('resize', updatePageSize);
    return () => window.removeEventListener('resize', updatePageSize);
  }, []);

  useEffect(() => {
    setImagePage(0);
  }, [imagePageSize]);

  useEffect(() => {
    if (!schema) return;
    const activeSchema = schema;
    async function loadDocument() {
      if (mode !== 'edit' || !itemId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const response = await fetchWithAuthRedirect(router, `${apiPrefix}/${collectionName}/${encodeURIComponent(itemId)}`, {
          credentials: 'include',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || 'Failed to load document');
        }
        const data = await response.json();
        const loaded = data.document ?? {};
        const normalized = activeSchema.fields.reduce<FormData>((acc, field) => {
          acc[field.name] = normalizeValue(loaded[field.name], field);
          return acc;
        }, {});
        if (collectionName === 'boutique') {
          normalized.shortDescription = String(loaded.shortDescription ?? loaded.excerpt ?? normalized.shortDescription ?? '');
          normalized.details = Array.isArray(loaded.details)
            ? loaded.details
            : Array.isArray(loaded.detail)
              ? loaded.detail
              : normalized.details;
          normalized.specs = Array.isArray(loaded.specs) ? loaded.specs : normalized.specs;
          normalized.price = loaded.price !== undefined && loaded.price !== null ? String(loaded.price) : String(normalized.price ?? '');
          const legacyStockValue = String(loaded.inStock ?? loaded.stock ?? loaded.availability ?? '').trim().toLowerCase();
          normalized.inStock = typeof loaded.inStock === 'boolean'
            ? loaded.inStock
            : legacyStockValue.length > 0
              ? !legacyStockValue.includes('out') && !legacyStockValue.includes('unavailable') && !legacyStockValue.includes('out of stock')
              : false;
          normalized.category = String(loaded.category ?? loaded.categoryId ?? normalized.category ?? '');
          normalized.subcategory = String(loaded.subcategory ?? normalized.subcategory ?? '');
        }
        if (activeSchema.singleton) {
          normalized._id = loaded._id ?? 'main';
        } else {
          normalized._id = loaded._id ?? loaded[activeSchema.idField] ?? '';
        }
        setFormData(normalized);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unable to load record';
        toast.error(errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }

    loadDocument();
  }, [collectionName, itemId, mode, schema]);

  const relationCollectionMeta = useMemo(() => {
    if (!schema) return {} as Record<string, { valueField: string; labelField: string }>;
    return schema.fields
      .filter((field) => field.relation)
      .reduce((acc, field) => {
        const collection = field.relation!.collection;
        acc[collection] = {
          valueField: field.relation!.valueField ?? '_id',
          labelField: field.relation!.labelField ?? 'label',
        };
        return acc;
      }, {} as Record<string, { valueField: string; labelField: string }>);
  }, [schema]);

  async function refreshRelatedOptions() {
    if (!relationCollections.length) return;
    const values: RelatedOptions = {};
    await Promise.all(
      relationCollections.map(async (rel) => {
        try {
          const response = await fetchWithAuthRedirect(router, `${apiPrefix}/related/${rel}`, { credentials: 'include' });
          if (!response.ok) {
            values[rel] = [];
            return;
          }
          const data = await response.json();
          const meta = relationCollectionMeta[rel] ?? { valueField: '_id', labelField: 'label' };
          values[rel] = Array.isArray(data.items)
            ? data.items.map((item: any) => ({
                value: String(item[meta.valueField] ?? item._id),
                label: String(item[meta.labelField] ?? item.label ?? item.slug ?? item.id ?? item.filename ?? item._id),
                filename: item.filename,
                domains: Array.isArray(item.domains) ? normalizePoleDomains(item.domains) : undefined,
                productDomains: Array.isArray(item.productDomains) ? normalizePoleDomains(item.productDomains) : undefined,
                serviceDomains: Array.isArray(item.serviceDomains) ? normalizePoleDomains(item.serviceDomains) : undefined,
                subcategories: Array.isArray(item.subcategories)
                  ? item.subcategories.map((subcategory: any) => ({
                      slug: String(subcategory.slug ?? subcategory.id ?? subcategory.label ?? ''),
                      label: String(subcategory.label ?? subcategory.slug ?? ''),
                      description: subcategory.description ?? undefined,
                    }))
                  : undefined,
              }))
            : [];
        } catch {
          values[rel] = [];
        }
      }),
    );
    setRelatedOptions(values);
  }

  useEffect(() => {
    if (!relationCollections.length) return;
    refreshRelatedOptions();
  }, [relationCollections]);

  useEffect(() => {
    if (collectionName === 'boutique') {
      const options = getDynamicSubcategoryOptions(collectionName, formData, relatedOptions).map((option) => option.value);
      if (formData.subcategory && !options.includes(formData.subcategory)) {
        setFormData((prev) => ({ ...prev, subcategory: '' }));
      }
    }

    if (collectionName === 'news') {
      const options = getDynamicSubcategoryOptions(collectionName, formData, relatedOptions).map((option) => option.value);
      if (formData.subcategory && !options.includes(formData.subcategory)) {
        setFormData((prev) => ({ ...prev, subcategory: '' }));
      }
    }
  }, [collectionName, formData.category, formData.categoryId, formData.subcategory, relatedOptions]);

  useEffect(() => {
    if (!schema || !['products', 'services'].includes(collectionName)) return;

    const domainFieldName = schema.fields.some((field) => field.name === 'domainId')
      ? 'domainId'
      : schema.fields.some((field) => field.name === 'domain')
        ? 'domain'
        : null;

    if (!domainFieldName) return;

    const currentDomain = String(formData[domainFieldName] ?? '').trim();
    if (!currentDomain) return;

    const scopedDomainOptions = getPoleScopedDomainOptions(collectionName, domainFieldName, formData, relatedOptions) ?? [];
    if (!scopedDomainOptions.some((option) => option.value === currentDomain)) {
      setFormData((prev) => ({ ...prev, [domainFieldName]: '' }));
    }
  }, [schema, collectionName, formData.poleId, formData.pole, formData.domainId, formData.domain, relatedOptions]);

  function queueImageFiles(fieldName: string, files: FileList | File[]) {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const imageFiles = fileArray.filter((file): file is File => file instanceof File && file.size > 0);
    if (imageFiles.length === 0) return;

    setUploadQueues((prev) => {
      const current = prev[fieldName] ?? [];
      const recordSlug = getRecordSlug(formData);
      const queued = imageFiles.map((file, index) => {
        const match = file.name.match(/(\.[^/.]+)$/);
        const extension = match ? match[0] : '';
        const baseName = `${recordSlug}-${current.length + index + 1}`;
        return {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          filename: baseName,
          extension,
          label: baseName,
        };
      });
      return { ...prev, [fieldName]: [...current, ...queued] };
    });
  }

  function setGalleryOpenFor(fieldName: string, open: boolean) {
    setGalleryOpen((prev) => ({ ...prev, [fieldName]: open }));
  }

  function updateUploadQueueItem(fieldName: string, itemId: string, patch: Partial<UploadQueueItem>) {
    setUploadQueues((prev) => ({
      ...prev,
      [fieldName]: (prev[fieldName] ?? []).map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    }));
  }

  function removeUploadQueueItem(fieldName: string, itemId: string) {
    setUploadQueues((prev) => ({
      ...prev,
      [fieldName]: (prev[fieldName] ?? []).filter((item) => item.id !== itemId),
    }));
  }

  async function uploadPendingImages(fieldName: string) {
    const queueItems = uploadQueues[fieldName] ?? [];
    if (!queueItems.length) return;

    setUploadingImages(true);
    setError(null);
    setMessage(null);

    try {
      const uploadFormData = new FormData();
      queueItems.forEach((item) => {
        uploadFormData.append('images', item.file);
        uploadFormData.append('filenames', `${item.filename}${item.extension}`);
        uploadFormData.append('labels', item.label);
      });

      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images`, {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Upload failed');
      }

      const uploaded = Array.isArray(result.items) ? result.items : [];
      if (uploaded.length === 0) {
        throw new Error('No images were uploaded.');
      }

      setRelatedOptions((prev) => ({
        ...prev,
        images: [
          ...uploaded.map((item: any) => ({ value: String(item._id), label: item.label ?? item.filename, filename: item.filename })),
          ...(prev.images ?? []),
        ],
      }));

      const ids: string[] = uploaded.map((item: any) => String(item._id));
      const currentValue = formData[fieldName];
      if (Array.isArray(currentValue)) {
        const values = [...currentValue];
        ids.forEach((id) => {
          if (!values.includes(id)) values.push(id);
        });
        updateField(fieldName, values);
      } else {
        updateField(fieldName, ids[0]);
      }

      setUploadQueues((prev) => ({ ...prev, [fieldName]: [] }));
      const successMessage = `Uploaded ${uploaded.length} image${uploaded.length === 1 ? '' : 's'}.`;
      toast.success(successMessage);
      setMessage(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to upload image.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  }

  async function deleteImageFromLibrary(imageId: string, fieldName: string) {
    if (!window.confirm('Delete this image from the library? This cannot be undone.')) {
      return;
    }

    setUploadingImages(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images/${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to delete image.');
      }

      setRelatedOptions((prev) => ({
        ...prev,
        images: (prev.images ?? []).filter((item) => item.value !== imageId),
      }));

      setFormData((prev) => {
        const currentValue = prev[fieldName];
        if (Array.isArray(currentValue)) {
          return { ...prev, [fieldName]: currentValue.filter((id) => id !== imageId) };
        }
        if (currentValue === imageId) {
          return { ...prev, [fieldName]: '' };
        }
        return prev;
      });

      const successMessage = 'Image deleted successfully.';
      toast.success(successMessage);
      setMessage(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to delete image.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  }

  async function replaceImageInLibrary(fieldName: string, imageId: string, file: File) {
    if (!file || file.size === 0) return;

    setUploadingImages(true);
    setError(null);
    setMessage(null);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images/${encodeURIComponent(imageId)}`, {
        method: 'PATCH',
        body: uploadFormData,
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to replace image.');
      }

      const updated = result.item;
      setRelatedOptions((prev) => ({
        ...prev,
        images: (prev.images ?? []).map((item) =>
          item.value === imageId ? { ...item, label: updated.filename ?? item.label } : item,
        ),
      }));

      const successMessage = 'Image replaced successfully.';
      toast.success(successMessage);
      setMessage(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to replace image.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  }

  async function renameImageInLibrary(imageId: string, filename: string, label: string) {
    const fileName = filename.trim();
    const imageLabel = label.trim();
    if (!fileName && !imageLabel) {
      const errorMessage = 'Filename or related name must be provided.';
      toast.error(errorMessage);
      setError(errorMessage);
      return;
    }

    setUploadingImages(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      if (fileName) {
        formData.append('filename', fileName);
      }
      if (imageLabel) {
        formData.append('label', imageLabel);
      }

      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/images/${encodeURIComponent(imageId)}`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to rename image.');
      }

      const updated = result.item;
      setRelatedOptions((prev) => ({
        ...prev,
        images: (prev.images ?? []).map((item) =>
          item.value === imageId ? { ...item, label: updated.label ?? item.label, filename: updated.filename ?? item.filename } : item,
        ),
      }));
      setImageEdits((prev) => ({
        ...prev,
        [imageId]: {
          filename: updated.filename ?? fileName,
          label: updated.label ?? imageLabel,
        },
      }));
      const successMessage = 'Image metadata updated successfully.';
      toast.success(successMessage);
      setMessage(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to rename image.';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setUploadingImages(false);
    }
  }

  useEffect(() => {
    if (!schema) return;
    const slugField = schema.fields.find((field) => field.type === 'slug');
    if (!slugField) return;

    const titleField = schema.fields.find((field) => field.name === 'title');
    const labelField = schema.fields.find((field) => field.name === 'label');
    const sourceName = titleField?.name ?? labelField?.name;
    if (!sourceName) return;

    const sourceValue = String(formData[sourceName] ?? '');
    const generatedSlug = slugify(sourceValue);
    const currentSlug = String(formData[slugField.name] ?? '');

    if (!sourceValue && !currentSlug) return;
    if (currentSlug !== generatedSlug) {
      setFormData((prev) => ({ ...prev, [slugField.name]: generatedSlug }));
    }
  }, [formData.title, formData.label, schema]);

  useEffect(() => {
    if (!schema || collectionName !== 'newsCategories') return;
    const labelValue = String(formData.label ?? '').trim();
    const generatedSlug = slugify(labelValue);
    const currentSlug = String(formData.slug ?? '').trim();

    if (labelValue && currentSlug !== generatedSlug) {
      setFormData((prev) => ({ ...prev, slug: generatedSlug }));
    }
  }, [collectionName, formData.label, formData.slug, schema]);

  if (!schema) {
    return <div className="p-6 text-red-600">Unknown Atlantic Dunes collection: {collectionName}</div>;
  }

  function updateField(name: string, value: any) {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function toggleRelationCreate(fieldName: string, open: boolean) {
    setRelationCreateOpen((prev) => ({ ...prev, [fieldName]: open }));
  }

  function updateRelationDraft(fieldName: string, patch: Partial<{ label: string; slug: string; description: string }>) {
    setRelationDrafts((prev) => ({
      ...prev,
      [fieldName]: {
        label: prev[fieldName]?.label ?? '',
        slug: prev[fieldName]?.slug ?? '',
        description: prev[fieldName]?.description ?? '',
        ...patch,
      },
    }));
  }

  async function createRelatedRecord(field: AtlanticDunesField) {
    if (!field.relation) return;

    const relationCollection = field.relation.collection;
    const relationValueField = field.relation.valueField ?? '_id';
    const relationLabelField = field.relation.labelField ?? 'label';
    const draft = relationDrafts[field.name] ?? { label: '', slug: '', description: '' };
    const label = draft.label.trim();
    const slug = draft.slug.trim();
    const description = draft.description.trim();

    if (!label || !slug) {
      const errorMessage = 'Label and slug are required to create a new item.';
      toast.error(errorMessage);
      setError(errorMessage);
      return;
    }

    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const payload: Record<string, any> = { label, slug };
      if (field.relation.collection === 'poles') {
        payload.shortDescription = description;
      }
      if (field.relation.collection === 'domains') {
        payload.description = description;
      }
      if (field.relation.collection === 'newsCategories') {
        payload.description = description;
      }

      const response = await fetchWithAuthRedirect(router, `${apiPrefix}/${field.relation.collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || `Unable to create ${field.label.toLowerCase()}.`);
      }

      const document = result.document;
      const optionValue = String(document[relationValueField]);
      const optionLabel = String(document[relationLabelField] ?? document.label ?? optionValue);
      const option = { value: optionValue, label: optionLabel };

      setRelatedOptions((prev) => ({
        ...prev,
        [relationCollection]: [...(prev[relationCollection] ?? []), option],
      }));

      updateField(field.name, optionValue);
      setRelationDrafts((prev) => ({
        ...prev,
        [field.name]: { label: '', slug: '', description: '' },
      }));
      toggleRelationCreate(field.name, false);

      const successMessage = `${field.label} created and selected.`;
      toast.success(successMessage);
      setMessage(successMessage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : `Unable to create ${field.label.toLowerCase()}.`;
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  function updateArrayItem(fieldName: string, index: number, value: string) {
    setFormData((prev) => {
      const list = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
      list[index] = value;
      return { ...prev, [fieldName]: list };
    });
  }

  function addArrayItem(fieldName: string, defaultValue: any = '') {
    setFormData((prev) => {
      const list = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
      const hasDomainSlug = ['domains', 'productDomains', 'serviceDomains', 'subcategories'].includes(fieldName);
      const newItem = hasDomainSlug && defaultValue && typeof defaultValue === 'object'
        ? { ...defaultValue, slug: '' }
        : defaultValue;
      return { ...prev, [fieldName]: [...list, newItem] };
    });
  }

  function removeArrayItem(fieldName: string, index: number) {
    setFormData((prev) => {
      const list = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
      list.splice(index, 1);
      return { ...prev, [fieldName]: list.length ? list : [''] };
    });
  }

  function updateObjectArrayItem(fieldName: string, index: number, key: string, value: string) {
    setFormData((prev) => {
      const list = Array.isArray(prev[fieldName]) ? [...prev[fieldName]] : [];
      const item = { ...list[index], [key]: value };
      if ((['domains', 'productDomains', 'serviceDomains', 'subcategories'].includes(fieldName)) && key === 'label') {
        item.slug = slugify(value);
      }
      list[index] = item;
      return { ...prev, [fieldName]: list };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!schema) return;
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    const activeSchema = schema;
    const payload = { ...formData };
    if (activeSchema.singleton) {
      payload._id = 'main';
    }

    const objectArrayFields = ['domains', 'productDomains', 'serviceDomains'];
    objectArrayFields.forEach((fieldName) => {
      if (activeSchema.fields.some((field) => field.name === fieldName) && Array.isArray(payload[fieldName])) {
        payload[fieldName] = payload[fieldName].map((domain: any) => ({
          ...domain,
          slug: slugify(String(domain?.label ?? '')),
        }));
      }
    });

    if (['boutiqueCategories', 'newsCategories'].includes(collectionName) && Array.isArray(payload.subcategories)) {
      payload.subcategories = payload.subcategories.map((subcategory: any) => ({
        label: String(subcategory?.label ?? ''),
        slug: slugify(String(subcategory?.label ?? '')),
      }));
    }

    if (collectionName === 'news') {
      const selectedCategory = (relatedOptions.newsCategories ?? []).find(
        (option) => String(option.value) === String(payload.categoryId ?? '') || String((option as any).slug ?? option.value) === String(payload.categoryId ?? ''),
      );
      if (selectedCategory?.label) {
        payload.category = selectedCategory.label;
      }
    }

    try {
      const url = mode === 'create' ? `${apiPrefix}/${collectionName}` : `${apiPrefix}/${collectionName}/${encodeURIComponent(itemId ?? String(formData._id))}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const response = await fetchWithAuthRedirect(router, url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to save record');
      }
      const successMessage = 'Saved successfully.';
      toast.success(successMessage);
      setMessage(successMessage);
      if (mode === 'create' && result.document?._id) {
        const dashboardPrefix = siteName ? `/dashboard/websites/${siteName}` : '/dashboard/websites/atlanticdunes';
        router.push(`${dashboardPrefix}/${getManagePageKey(collectionName)}/${encodeURIComponent(result.document._id)}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unable to save record';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: AtlanticDunesField) {
    const value = formData[field.name];
    const relationOptions = field.relation ? relatedOptions[field.relation.collection] || [] : field.options || [];
    const dynamicSubcategoryOptions = getDynamicSubcategoryOptions(collectionName, formData, relatedOptions);
    const poleScopedDomainOptions = getPoleScopedDomainOptions(collectionName, field.name, formData, relatedOptions);
    const selectedPole = getPoleValue(collectionName, formData);
    const domainDependsOnPole = isPoleScopedDomainField(collectionName, field.name);
    const selectOptions = field.name === 'subcategory' && (collectionName === 'boutique' || collectionName === 'news')
      ? dynamicSubcategoryOptions
      : (poleScopedDomainOptions ?? relationOptions);

    switch (field.type) {
      case 'text':
      case 'date':
      case 'number': {
        const isAutoDateField = mode === 'create' && collectionName === 'news' && ['date', 'publishedAt'].includes(field.name);
        return (
          <div>
            <input
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              id={field.name}
              value={String(value ?? '')}
              onChange={(event) => updateField(field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)}
              readOnly={isAutoDateField}
              className={`mt-3 w-full rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 ${
                isAutoDateField ? 'bg-brand-50/80 text-brand-600 cursor-not-allowed' : ''
              }`}
              placeholder={field.placeholder}
            />
            {isAutoDateField && <p className="mt-2 text-xs text-brand-600">🔒 Auto-generated as today's date.</p>}
          </div>
        );
      }
      case 'slug': {
        return (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              id={field.name}
              value={String(value ?? '')}
              readOnly
              className="w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-4 py-2.5 text-sm text-brand-600 outline-none"
              placeholder="Auto-generated from title or label"
            />
            <p className="text-xs text-brand-600">🔒 This is automatically generated and read-only.</p>
          </div>
        );
      }
      case 'textarea':
        return (
          <textarea
            id={field.name}
            value={String(value ?? '')}
            onChange={(event) => updateField(field.name, event.target.value)}
            rows={field.name === 'description' ? 6 : 4}
            className="mt-3 w-full rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder={field.placeholder}
          />
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center gap-3 mt-3 text-sm text-brand-900">
            <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-200 transition-colors" style={{ backgroundColor: Boolean(value) ? '#3b82f6' : undefined }}>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => updateField(field.name, event.target.checked)}
                className="sr-only"
              />
              <div
                className="inline-block h-4 w-4 transform rounded-full bg-brand-50/80 shadow transition-transform"
                style={{ transform: Boolean(value) ? 'translateX(1.5rem)' : 'translateX(0.25rem)' }}
              />
            </div>
            <span>{field.description ?? 'Enabled'}</span>
          </label>
        );
      case 'select': {
        const imageRelationOptions = relationOptions as RelatedOption[];
        const selectedImageOption = field.relation?.collection === 'images' ? imageRelationOptions.find((option) => option.value === String(value)) : undefined;
        const galleryVisible = galleryOpen[field.name] ?? false;
        const queue = uploadQueues[field.name] ?? [];
        const unselectedOptions = imageRelationOptions.filter((option) => option.value !== String(value));
        const filteredOptions = imageSearch.trim()
          ? unselectedOptions.filter((option) => option.label.toLowerCase().includes(imageSearch.toLowerCase()))
          : unselectedOptions;
        const pageCount = Math.max(1, Math.ceil(filteredOptions.length / imagePageSize));
        const currentPage = Math.min(imagePage, pageCount - 1);
        const pageOptions = filteredOptions.slice(currentPage * imagePageSize, currentPage * imagePageSize + imagePageSize);
        const selectedEdit = selectedImageOption
          ? imageEdits[selectedImageOption.value] ?? {
              filename: selectedImageOption.filename ?? selectedImageOption.label,
              label: selectedImageOption.label,
            }
          : undefined;
        const selectedFilenameParts = selectedEdit?.filename.split('.') ?? [''];
        const selectedExtension = selectedFilenameParts.length > 1 ? `.${selectedFilenameParts.pop()}` : '';
        const selectedBaseName = sanitizeFilename(selectedFilenameParts.join('.'));
        const sanitizedFilename = `${selectedBaseName}${selectedExtension}`;

        return (
          <>
            <select
              id={field.name}
              value={String(value ?? '')}
              onChange={(event) => updateField(field.name, event.target.value)}
              disabled={domainDependsOnPole && !selectedPole}
              className={`mt-3 w-full rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 ${
                domainDependsOnPole && !selectedPole ? 'cursor-not-allowed bg-brand-50/80 text-brand-600' : ''
              }`}
            >
              <option value="">{domainDependsOnPole && !selectedPole ? 'Select Pole first' : `Select ${field.label}`}</option>
              {selectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {domainDependsOnPole && !selectedPole ? (
              <p className="mt-2 text-xs text-brand-600">Select a pole first to load available domains.</p>
            ) : null}
            {['poles', 'domains', 'newsCategories'].includes(field.relation?.collection ?? '') ? (
              <div className="mt-4 rounded-xl border border-brand-300/80 bg-brand-100 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">✨ Create new {field.label.toLowerCase()}</p>
                    <p className="text-xs text-brand-900/80">Don't see what you need? Add it right here.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRelationCreate(field.name, !(relationCreateOpen[field.name] ?? false))}
                    className="rounded-lg border border-brand-300/80 bg-brand-50/80 px-4 py-2 text-sm font-medium text-brand-800 shadow-xs transition hover:bg-brand-100"
                  >
                    {relationCreateOpen[field.name] ? `Cancel` : `New ${field.label}`}
                  </button>
                </div>
                {relationCreateOpen[field.name] ? (
                  <div className="mt-4 space-y-4 rounded-xl border border-brand-300 bg-brand-50/80 p-4">
                    <div>
                      <label className="text-sm font-medium text-brand-900">Label</label>
                      <p className="text-xs text-brand-900/80 mt-1">What should this be called?</p>
                      <input
                        type="text"
                        value={relationDrafts[field.name]?.label ?? ''}
                        onChange={(event) => updateRelationDraft(field.name, {
                          label: event.target.value,
                          slug: slugify(event.target.value),
                        })}
                        className="mt-2 w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-900">{field.relation?.collection === 'newsCategories' ? 'Category ID' : 'Slug'}</label>
                      <p className="text-xs text-brand-900/80 mt-1">Auto-generated from label</p>
                      <input
                        type="text"
                        value={relationDrafts[field.name]?.slug ?? ''}
                        readOnly
                        className="mt-2 w-full rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm text-brand-600 outline-none"
                        placeholder="Auto-generated from label"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-brand-900">{field.relation?.collection === 'poles' ? 'Short description' : 'Description'}</label>
                      <p className="text-xs text-brand-900/80 mt-1">Optional: explain what this is for</p>
                      <textarea
                        value={relationDrafts[field.name]?.description ?? ''}
                        onChange={(event) => updateRelationDraft(field.name, { description: event.target.value })}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => createRelatedRecord(field)}
                      disabled={saving}
                      className="w-full rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create {field.label}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {field.relation?.collection === 'images' ? (
              <div className="mt-4 rounded-xl border border-brand-300 bg-brand-50/80 p-4 space-y-6">
                {selectedImageOption ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                      <div className="relative overflow-hidden rounded-xl border border-brand-300 bg-slate-300/50">
                        <img
                          src={`${apiPrefix}/images/${encodeURIComponent(selectedImageOption.value)}`}
                          alt={selectedImageOption.label}
                          className="h-40 w-full object-cover"
                        />
                        <label className="pointer-events-auto absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-stone-200/80 px-3 py-2 text-xs font-semibold text-brand-900 shadow-xs">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => updateField(field.name, '')}
                            className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                          />
                          Selected
                        </label>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <label className="text-sm font-medium text-brand-900">Filename</label>
                          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="flex flex-1 items-center gap-2">
                              <input
                                type="text"
                                value={selectedBaseName}
                                onChange={(event) => {
                                  const safeBaseName = event.target.value.replace(/[\\/]/g, '');
                                  setImageEdits((prev) => ({
                                    ...prev,
                                    [selectedImageOption.value]: {
                                      filename: `${safeBaseName}${selectedExtension}`,
                                      label: selectedEdit?.label ?? selectedImageOption.label,
                                    },
                                  }));
                                }}
                                className="flex-1 rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                              />
                              <span className="flex items-center rounded-lg border border-brand-300/80 bg-white px-3 py-2 text-sm text-brand-900/80">{selectedExtension || '.png'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => renameImageInLibrary(
                                selectedImageOption.value,
                                sanitizedFilename,
                                selectedEdit?.label ?? selectedImageOption.label,
                              )}
                              disabled={uploadingImages}
                              className="rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteImageFromLibrary(selectedImageOption.value, field.name)}
                              disabled={uploadingImages}
                              className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-xs transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-brand-300 bg-slate-50 p-6 text-center">
                    <p className="text-sm text-brand-600">📷 No image selected</p>
                  </div>
                )}

                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md">
                      {uploadingImages ? 'Uploading...' : '📤 Upload an image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const files = event.target.files;
                          if (files?.length) {
                            queueImageFiles(field.name, files);
                            event.target.value = '';
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setGalleryOpenFor(field.name, !galleryVisible)}
                      className="rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm font-medium text-brand-900 shadow-xs transition hover:bg-brand-100"
                    >
                      {galleryVisible ? '🙈 Hide gallery' : '👁️ View gallery'}
                    </button>
                  </div>
                  {queue.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-200/60 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-brand-900">⏳ Pending upload ({queue.length})</p>
                      <p className="text-xs text-brand-900/80 mt-1">Edit details before uploading.</p>
                      <div className="mt-4 space-y-4">
                        {queue.map((item) => (
                          <div key={item.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <div className="grid gap-3 rounded-lg border border-brand-300 bg-brand-50/80 p-3">
                              <div>
                                <label className="text-sm font-medium text-brand-900">Filename</label>
                                <input
                                  type="text"
                                  value={item.filename}
                                  onChange={(event) => updateUploadQueueItem(field.name, item.id, { filename: event.target.value })}
                                  className="mt-2 w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-brand-900">Name/Label</label>
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(event) => updateUploadQueueItem(field.name, item.id, { label: event.target.value })}
                                  className="mt-2 w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUploadQueueItem(field.name, item.id)}
                              className="rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm font-medium text-brand-900 shadow-xs transition hover:bg-brand-100"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => uploadPendingImages(field.name)}
                          className="w-full rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md"
                        >
                          Upload {queue.length} image{queue.length === 1 ? '' : 's'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                {galleryVisible ? (
                  <div className="space-y-4 rounded-xl border border-brand-300 bg-brand-50/80 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <input
                        type="search"
                        value={imageSearch}
                        onChange={(event) => setImageSearch(event.target.value)}
                        placeholder="Search images..."
                        className="w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
                      />
                      <p className="text-sm text-brand-600">{filteredOptions.length} available</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {pageOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField(field.name, option.value)}
                          className="group flex flex-col overflow-hidden rounded-xl border border-brand-300 bg-slate-50 text-left transition hover:border-brand-400 hover:shadow-md"
                        >
                          <div className="relative h-40 w-full overflow-hidden bg-slate-300/50">
                            <img
                              src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                              alt={option.label}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                            />
                            <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-stone-200/80 p-2 shadow-xs">
                              <input
                                type="checkbox"
                                checked={false}
                                readOnly
                                className="h-4 w-4 rounded border-slate-300 text-blue-500"
                              />
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="truncate text-sm font-semibold text-brand-900">{option.label}</p>
                            <p className="mt-2 text-xs text-brand-600">{option.filename ?? option.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-brand-600">
                        Showing {filteredOptions.length === 0 ? 0 : currentPage * imagePageSize + 1} – {Math.min((currentPage + 1) * imagePageSize, filteredOptions.length)} of {filteredOptions.length}
                      </p>
                      <div className="inline-flex items-center gap-2 rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900">
                        <button
                          type="button"
                          onClick={() => setImagePage((page) => Math.max(page - 1, 0))}
                          disabled={currentPage === 0}
                          className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="font-semibold">{currentPage + 1} / {pageCount}</span>
                        <button
                          type="button"
                          onClick={() => setImagePage((page) => Math.min(page + 1, pageCount - 1))}
                          disabled={currentPage >= pageCount - 1}
                          className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        );
      }
      case 'multiSelect': {
        const selectedValues = Array.isArray(value) ? value : [];
        const isImageGallery = field.relation?.collection === 'images';
        const imageRelationOptions = relationOptions as RelatedOption[];
        const queue = uploadQueues[field.name] ?? [];
        const galleryVisible = galleryOpen[field.name] ?? false;
        const selectedOptions = isImageGallery ? imageRelationOptions.filter((option) => selectedValues.includes(option.value)) : [];
        const unselectedOptions = isImageGallery ? imageRelationOptions.filter((option) => !selectedValues.includes(option.value)) : [];
        const filteredOptions = isImageGallery
          ? unselectedOptions.filter((option) => option.label.toLowerCase().includes(imageSearch.toLowerCase()))
          : relationOptions;

        const pageCount = isImageGallery ? Math.max(1, Math.ceil(filteredOptions.length / imagePageSize)) : 1;
        const currentPage = Math.min(imagePage, pageCount - 1);
        const pageOptions = isImageGallery
          ? filteredOptions.slice(currentPage * imagePageSize, currentPage * imagePageSize + imagePageSize)
          : filteredOptions;

        if (isImageGallery) {
          return (
            <div className="space-y-4 mt-3">
              <div className="rounded-xl border border-brand-300 bg-brand-50/80 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-900">🖼️ Image Gallery</p>
                    <p className="text-xs text-brand-900/80 mt-1">Select from your uploaded images.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="search"
                      value={imageSearch}
                      onChange={(event) => setImageSearch(event.target.value)}
                      placeholder="Search images..."
                      className="w-full rounded-lg border border-brand-300/80 bg-brand-50/80 px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryOpenFor(field.name, !galleryVisible)}
                      className="rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm font-medium text-brand-900 shadow-xs transition hover:bg-brand-100"
                    >
                      {galleryVisible ? '🙈 Hide' : '👁️ View'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr] mt-6">
                  <div className="rounded-xl border border-brand-300 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-brand-900">📤 Upload New Images</p>
                    <p className="mt-1 text-xs text-brand-900/80">Add more images to your library.</p>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md">
                      {uploadingImages ? '⏳ Uploading...' : '📤 Upload images'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={(event) => {
                          const files = event.target.files;
                          if (files?.length) {
                            queueImageFiles(field.name, files);
                            event.target.value = '';
                          }
                        }}
                      />
                    </label>
                    {queue.length > 0 ? (
                      <div className="mt-4 space-y-4 rounded-xl border border-brand-300 bg-brand-50/80 p-4">
                        <p className="text-sm font-semibold text-brand-900">⏳ Pending ({queue.length})</p>
                        <p className="text-xs text-brand-900/80">Review before uploading.</p>
                        <div className="space-y-4">
                          {queue.map((item) => (
                            <div key={item.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                              <div className="grid gap-3 rounded-lg border border-brand-300 bg-slate-50 p-3">
                                <div>
                                  <label className="text-sm font-medium text-brand-900">Filename</label>
                                  <input
                                    type="text"
                                    value={item.filename}
                                    onChange={(event) => updateUploadQueueItem(field.name, item.id, { filename: event.target.value.replace(/[\\/]/g, '') })}
                                    className="mt-2 w-full rounded-lg border border-brand-300/80 bg-white px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-brand-900">Name</label>
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(event) => updateUploadQueueItem(field.name, item.id, { label: event.target.value })}
                                    className="mt-2 w-full rounded-lg border border-brand-300/80 bg-white px-3 py-2 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadQueueItem(field.name, item.id)}
                                className="rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm font-medium text-brand-900 shadow-xs transition hover:bg-brand-100"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => uploadPendingImages(field.name)}
                            className="w-full rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md"
                          >
                            Upload {queue.length} image{queue.length === 1 ? '' : 's'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-brand-300 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-brand-900">✅ Selected ({selectedOptions.length})</p>
                    <p className="mt-1 text-xs text-brand-900/80">Already added to this record.</p>
                    {selectedOptions.length === 0 ? (
                      <p className="mt-4 text-sm text-brand-600">No images selected yet.</p>
                    ) : (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {selectedOptions.map((option) => (
                          <div key={option.value} className="rounded-xl border border-brand-300 bg-brand-50/80 p-3">
                            <div className="relative h-32 overflow-hidden rounded-lg bg-slate-300/50">
                              <img
                                src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                                alt={option.label}
                                className="h-full w-full object-cover"
                              />
                              <label className="absolute right-3 top-3 inline-flex items-center rounded-lg bg-stone-200/80 p-2 shadow-xs">
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => {
                                    const values = Array.isArray(value) ? [...value] : [];
                                    updateField(field.name, values.filter((id) => id !== option.value));
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                                />
                              </label>
                            </div>
                            <div className="mt-3 space-y-2">
                              <p className="truncate text-sm font-semibold text-brand-900">{option.label}</p>
                              <p className="text-xs text-brand-600">{option.filename ?? option.label}</p>
                              <button
                                type="button"
                                onClick={() => deleteImageFromLibrary(option.value, field.name)}
                                className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2 text-xs font-medium text-red-700 shadow-xs transition hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {galleryVisible ? (
                <div className="space-y-4 rounded-xl border border-brand-300 bg-brand-50/80 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-brand-900/80">Click to add images to this record.</p>
                    <p className="text-sm text-brand-600">{filteredOptions.length} available</p>
                  </div>

                  {filteredOptions.length === 0 ? (
                    <div className="rounded-xl border border-brand-300 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-brand-600">No matching images found</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pageOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateField(field.name, [...selectedValues, option.value])}
                            className="group flex flex-col overflow-hidden rounded-xl border border-brand-300 bg-slate-50 text-left transition hover:border-brand-400 hover:shadow-md"
                          >
                            <div className="relative h-40 w-full overflow-hidden bg-slate-300/50">
                              <img
                                src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                                alt={option.label}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                              />
                              <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-stone-200/80 p-2 shadow-xs">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  readOnly
                                  className="h-4 w-4 rounded border-slate-300 text-blue-500"
                                />
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="truncate text-sm font-semibold text-brand-900">{option.label}</p>
                              <p className="mt-2 text-xs text-brand-600">{(option as RelatedOption).filename ?? option.label}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-brand-600">
                          Showing {currentPage * imagePageSize + 1} – {Math.min((currentPage + 1) * imagePageSize, filteredOptions.length)} of {filteredOptions.length}
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-brand-300/80 bg-brand-50/80 px-3 py-2 text-sm text-brand-900">
                          <button
                            type="button"
                            onClick={() => setImagePage((page) => Math.max(page - 1, 0))}
                            disabled={currentPage === 0}
                            className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="font-semibold">{currentPage + 1} / {pageCount}</span>
                          <button
                            type="button"
                            onClick={() => setImagePage((page) => Math.min(page + 1, pageCount - 1))}
                            disabled={currentPage >= pageCount - 1}
                            className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-300/50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <div className="mt-3 space-y-3">
            {relationOptions.length > 0 ? (
              relationOptions.map((option) => {
                const selected = Array.isArray(value) ? value.includes(option.value) : false;
                return (
                  <label key={option.value} className="flex items-center gap-3 p-3 rounded-lg border border-brand-300 bg-brand-50/80 hover:bg-brand-100 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => {
                        const values = Array.isArray(value) ? [...value] : [];
                        if (event.target.checked) {
                          values.push(option.value);
                        } else {
                          const index = values.indexOf(option.value);
                          if (index !== -1) values.splice(index, 1);
                        }
                        updateField(field.name, values);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-brand-900 font-medium">{option.label}</span>
                  </label>
                );
              })
            ) : (
              <div className="rounded-lg border border-brand-300 bg-slate-50 p-4 text-sm text-brand-600">
                No options available yet. Create one above!
              </div>
            )}
          </div>
        );
      }
      case 'stringArray':
        return (
          <div className="space-y-3 mt-3">
            {Array.isArray(value) ? value.map((item: string, index: number) => (
              <div key={`${field.name}-${index}`} className="flex gap-2">
                <input
                  type="text"
                  value={item ?? ''}
                  onChange={(event) => updateArrayItem(field.name, index, event.target.value)}
                  className="flex-1 rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  placeholder={field.itemLabel ?? 'Item'}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(field.name, index)}
                  className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2.5 text-sm font-medium text-red-700 shadow-xs transition hover:bg-red-50"
                >
                  Remove
                </button>
              </div>
            )) : null}
            <button
              type="button"
              onClick={() => addArrayItem(field.name, '')}
              className="rounded-lg border border-brand-300/80 bg-brand-100 px-4 py-2.5 text-sm font-medium text-brand-800 shadow-xs transition hover:bg-brand-100"
            >
              + Add {field.itemLabel ?? 'item'}
            </button>
          </div>
        );
      case 'objectArray':
        return (
          <div className="space-y-4 mt-3">
            {Array.isArray(value)
              ? value.map((item: any, index: number) => (
                  <div key={`${field.name}-${index}`} className="rounded-xl border border-brand-300 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <p className="font-semibold text-brand-900">#{index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(field.name, index)}
                        className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2 text-sm font-medium text-red-700 shadow-xs transition hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {field.itemFields?.map((childField) => (
                        <div key={childField.name}>
                          <label className="block text-sm font-medium text-brand-900">{childField.label}</label>
                          <input
                            type="text"
                            value={item[childField.name] ?? ''}
                            onChange={(event) => updateObjectArrayItem(field.name, index, childField.name, event.target.value)}
                            className="mt-2 w-full rounded-lg border border-brand-300/80 bg-white px-4 py-2.5 text-sm text-brand-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              : null}
            <button
              type="button"
              onClick={() => addArrayItem(field.name, field.itemFields?.reduce((acc, child) => ({ ...acc, [child.name]: '' }), {}) ?? {})}
              className="rounded-lg border border-brand-300/80 bg-brand-100 px-4 py-2.5 text-sm font-medium text-brand-800 shadow-xs transition hover:bg-brand-100"
            >
              + Add {field.itemLabel ?? 'row'}
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 2) {
      router.back();
      return;
    }

    const fallbackPage = collectionToManagePage[collectionName] ?? '';
    if (siteName && fallbackPage) {
      router.push(`/dashboard/websites/${siteName}/${fallbackPage}`);
    } else {
      router.push('/dashboard/websites/atlanticdunes');
    }
  }, [collectionName, router, siteName]);

  return (
    <div className="space-y-6 bg-white min-h-screen">
      {/* Header */}
      <div className="rounded-xl border border-brand-300 bg-gradient-to-br from-brand-500 to-brand-600 p-8 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg bg-brand-100 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800 shadow-xs">
              {mode === 'create' ? '✨ Create New' : '✏️ Edit'}
            </div>
            <h2 className="text-3xl font-semibold text-white">{schema.label}</h2>
            <p className="mt-2 text-sm text-white/90">{schema.description}</p>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-white px-4 py-2.5 text-sm font-medium text-brand-900 shadow-xs transition-all duration-200 hover:bg-brand-50 hover:shadow"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-brand-900/80/90">Form Completion</p>
            <p className="text-xs font-semibold text-brand-900">{formCompletion}%</p>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-300/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-300 to-blue-500 transition-all duration-300"
              style={{ width: `${formCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="rounded-xl border border-rose-300/40 bg-rose-50/70 p-4 flex gap-3">
          <svg className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700/90">{error}</p>
        </div>
      )}

      {/* Form Sections */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {loading ? (
          <div className="rounded-xl border border-brand-300 bg-brand-50/80 p-12 text-center shadow-xs">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-300/50 flex items-center justify-center animate-pulse">
              <svg className="h-6 w-6 text-brand-600/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-brand-900/80/90">Loading record...</p>
          </div>
        ) : (
          fieldSections.map((section) => (
            <div key={section.name}>
              {/* Section Header */}
              <button
                type="button"
                onClick={() => setExpandedSections(prev => ({ ...prev, [section.name]: !prev[section.name] }))}
                className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-brand-300 bg-gradient-to-r from-stone-100 to-slate-50 hover:bg-slate-300/50/50 transition group"
              >
                <span className="text-sm font-semibold text-brand-900">{section.label}</span>
                <svg
                  className="h-5 w-5 text-brand-600/60 transition-transform group-hover:text-brand-900/70"
                  style={{ transform: expandedSections[section.name] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {/* Section Fields */}
              {expandedSections[section.name] && (
                <div className="mt-2 space-y-3">
                  {section.fields.map((field) => (
                    <div key={field.name} className="rounded-xl border border-brand-300 bg-brand-50/70 p-6 shadow-xs hover:shadow-md transition">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <label htmlFor={field.name} className="text-sm font-semibold text-brand-900 flex items-center gap-2">
                            {field.label}
                            {field.required ? <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded">Required</span> : null}
                          </label>
                          {field.description ? <p className="mt-2 text-sm text-brand-900/80/90">{field.description}</p> : null}
                        </div>
                      </div>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 pt-4">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-slate-400 to-slate-500 px-6 py-3 text-sm font-medium text-white shadow-xs transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 rounded-lg border border-brand-300/80 bg-white px-6 py-3 text-sm font-medium text-brand-900 shadow-xs transition-all duration-200 hover:bg-slate-300/50/50 hover:shadow"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}















