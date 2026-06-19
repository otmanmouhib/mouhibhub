'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { fetchWithAuthRedirect } from 'lib/fetch-client';
import {
  AtlanticDunesCollectionSchema,
  AtlanticDunesField,
  getCollectionSchema,
} from '../lib/atlanticdunes-schema';

type RelatedOption = { value: string; label: string; filename?: string };
type RelatedOptions = Record<string, Array<RelatedOption>>;
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
    setFormData(defaults);
  }, [schema]);

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
          values[rel] = Array.isArray(data.items)
            ? data.items.map((item: any) => ({
                value: String(item._id),
                label: item.label ?? item.slug ?? item.id ?? item.filename ?? String(item._id),
                filename: item.filename,
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
    if (!schema || mode !== 'create') return;
    const slugField = schema.fields.find((field) => field.type === 'slug');
    if (!slugField) return;

    const titleField = schema.fields.find((field) => field.name === 'title');
    const labelField = schema.fields.find((field) => field.name === 'label');
    const sourceName = titleField?.name ?? labelField?.name;
    if (!sourceName) return;
    const sourceValue = String(formData[sourceName] ?? '');
    const currentSlug = String(formData[slugField.name] ?? '');

    if (!currentSlug && sourceValue) {
      setFormData((prev) => ({ ...prev, [slugField.name]: slugify(sourceValue) }));
    }
  }, [formData.title, formData.label, mode, schema]);

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
      return { ...prev, [fieldName]: [...list, defaultValue] };
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
        const dashboardPrefix = siteName ? `/dashboard/websites/${siteName}` : '/dashboard/atlanticdunes';
        router.push(`${dashboardPrefix}/${collectionName}/${encodeURIComponent(result.document._id)}`);
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

    switch (field.type) {
      case 'text':
      case 'date':
      case 'number':
        return (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            id={field.name}
            value={String(value ?? '')}
            onChange={(event) => updateField(field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)}
            className="mt-3 w-full rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder={field.placeholder}
          />
        );
      case 'slug': {
        return (
          <input
            type="text"
            id={field.name}
            value={String(value ?? '')}
            readOnly
            className="mt-3 w-full rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 outline-none"
            placeholder="Auto-generated from title or label"
          />
        );
      }
      case 'textarea':
        return (
          <textarea
            id={field.name}
            value={String(value ?? '')}
            onChange={(event) => updateField(field.name, event.target.value)}
            rows={field.name === 'description' ? 6 : 4}
            className="mt-3 w-full rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder={field.placeholder}
          />
        );
      case 'boolean':
        return (
          <label className="inline-flex items-center gap-2 mt-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(event) => updateField(field.name, event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
            />
            {field.description ?? 'Enabled'}
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
              className="mt-3 w-full rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select {field.label}</option>
              {relationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {['poles', 'domains', 'newsCategories'].includes(field.relation?.collection ?? '') ? (
              <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Create new {field.label.toLowerCase()}</p>
                    <p className="text-xs text-slate-500">Add a new {field.label.toLowerCase()} without leaving this form.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleRelationCreate(field.name, !(relationCreateOpen[field.name] ?? false))}
                    className="rounded-lg border border-slate-200/60 bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                  >
                    {relationCreateOpen[field.name] ? `Cancel` : `New ${field.label}`}
                  </button>
                </div>
                {relationCreateOpen[field.name] ? (
                  <div className="mt-4 space-y-4 rounded-xl border border-slate-200/60 bg-white p-4">
                    <div>
                      <label className="text-sm font-medium text-slate-900">Label</label>
                      <input
                        type="text"
                        value={relationDrafts[field.name]?.label ?? ''}
                        onChange={(event) => updateRelationDraft(field.name, {
                          label: event.target.value,
                          slug: slugify(event.target.value),
                        })}
                        className="mt-2 w-full rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900">{field.relation?.collection === 'newsCategories' ? 'Category ID' : 'Slug'}</label>
                      <input
                        type="text"
                        value={relationDrafts[field.name]?.slug ?? ''}
                        readOnly
                        className="mt-2 w-full rounded-lg border border-slate-200/60 bg-slate-100 px-3 py-2 text-sm text-slate-500 outline-none"
                        placeholder="Auto-generated from label"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-900">{field.relation?.collection === 'poles' ? 'Short description' : 'Description'}</label>
                      <textarea
                        value={relationDrafts[field.name]?.description ?? ''}
                        onChange={(event) => updateRelationDraft(field.name, { description: event.target.value })}
                        rows={3}
                        className="mt-2 w-full rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => createRelatedRecord(field)}
                      disabled={saving}
                      className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Create {field.label}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {field.relation?.collection === 'images' ? (
              <div className="mt-4 rounded-xl border border-slate-200/60 bg-white p-4 space-y-6">
                {selectedImageOption ? (
                  <>
                    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                      <div className="relative overflow-hidden rounded-xl border border-slate-200/60 bg-slate-100">
                        <img
                          src={`${apiPrefix}/images/${encodeURIComponent(selectedImageOption.value)}`}
                          alt={selectedImageOption.label}
                          className="h-40 w-full object-cover"
                        />
                        <label className="pointer-events-auto absolute right-3 top-3 inline-flex items-center gap-2 rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm">
                          <input
                            type="checkbox"
                            checked
                            onChange={() => updateField(field.name, '')}
                            className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                          />
                          Selected
                        </label>
                      </div>
                      <div className="grid gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-900">Filename</label>
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
                                className="flex-1 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                              />
                              <span className="flex items-center rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-600">{selectedExtension || '.png'}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => renameImageInLibrary(
                                selectedImageOption.value,
                                sanitizedFilename,
                                selectedEdit?.label ?? selectedImageOption.label,
                              )}
                              disabled={uploadingImages}
                              className="rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Save filename
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteImageFromLibrary(selectedImageOption.value, field.name)}
                              disabled={uploadingImages}
                              className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Delete image
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-6 text-center">
                    <p className="text-sm text-slate-500">No image selected</p>
                  </div>
                )}

                <div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md">
                      {uploadingImages ? 'Queued...' : 'Upload an image'}
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
                      className="rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                    >
                      {galleryVisible ? 'Hide gallery' : 'Open gallery'}
                    </button>
                  </div>
                  {queue.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Pending upload</p>
                      <p className="text-xs text-slate-500">Edit filename and label before uploading.</p>
                      <div className="mt-4 space-y-4">
                        {queue.map((item) => (
                          <div key={item.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <div className="grid gap-3 rounded-lg border border-slate-200/60 bg-white p-3">
                              <div>
                                <label className="text-sm font-medium text-slate-900">Filename</label>
                                <input
                                  type="text"
                                  value={item.filename}
                                  onChange={(event) => updateUploadQueueItem(field.name, item.id, { filename: event.target.value })}
                                  className="mt-2 w-full rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-slate-900">Related image name</label>
                                <input
                                  type="text"
                                  value={item.label}
                                  onChange={(event) => updateUploadQueueItem(field.name, item.id, { label: event.target.value })}
                                  className="mt-2 w-full rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeUploadQueueItem(field.name, item.id)}
                              className="rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => uploadPendingImages(field.name)}
                          className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
                        >
                          Upload queued images
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
                {galleryVisible ? (
                  <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <input
                        type="search"
                        value={imageSearch}
                        onChange={(event) => setImageSearch(event.target.value)}
                        placeholder="Filter gallery by name..."
                        className="w-full rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
                      />
                      <p className="text-sm text-slate-500">{filteredOptions.length} available</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {pageOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateField(field.name, option.value)}
                          className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 text-left transition hover:border-brand-300"
                        >
                          <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                            <img
                              src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                              alt={option.label}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                            />
                            <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-white/90 p-2 shadow-sm">
                              <input
                                type="checkbox"
                                checked={false}
                                readOnly
                                className="h-4 w-4 rounded border-slate-300 text-brand-500"
                              />
                            </div>
                          </div>
                          <div className="p-4">
                            <p className="truncate text-sm font-semibold text-slate-900">{option.label}</p>
                            <p className="mt-2 text-xs text-slate-500">{option.filename ?? option.label}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-slate-500">
                        Showing {filteredOptions.length === 0 ? 0 : currentPage * imagePageSize + 1} – {Math.min((currentPage + 1) * imagePageSize, filteredOptions.length)} of {filteredOptions.length}
                      </p>
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        <button
                          type="button"
                          onClick={() => setImagePage((page) => Math.max(page - 1, 0))}
                          disabled={currentPage === 0}
                          className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="font-semibold">{currentPage + 1} / {pageCount}</span>
                        <button
                          type="button"
                          onClick={() => setImagePage((page) => Math.min(page + 1, pageCount - 1))}
                          disabled={currentPage >= pageCount - 1}
                          className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
              <div className="rounded-xl border border-slate-200/60 bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gallery</p>
                    <p className="text-xs text-slate-500">Select from uploaded images.</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      type="search"
                      value={imageSearch}
                      onChange={(event) => setImageSearch(event.target.value)}
                      placeholder="Search gallery..."
                      className="w-full rounded-lg border border-slate-200/60 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
                    />
                    <button
                      type="button"
                      onClick={() => setGalleryOpenFor(field.name, !galleryVisible)}
                      className="rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                    >
                      {galleryVisible ? 'Hide gallery' : 'Open gallery'}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Upload new images</p>
                    <p className="mt-1 text-xs text-slate-500">Selected images remain visible.</p>
                    <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md">
                      {uploadingImages ? 'Uploading...' : 'Upload images'}
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
                      <div className="mt-4 space-y-4 rounded-xl border border-slate-200/60 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Pending upload</p>
                        <p className="text-xs text-slate-500">Edit filename and related name before uploading.</p>
                        <div className="space-y-4">
                          {queue.map((item) => (
                            <div key={item.id} className="grid gap-3 sm:grid-cols-[1fr_auto]">
                              <div className="grid gap-3 rounded-lg border border-slate-200/60 bg-slate-50 p-3">
                                <div>
                                  <label className="text-sm font-medium text-slate-900">Filename</label>
                                  <input
                                    type="text"
                                    value={item.filename}
                                    onChange={(event) => updateUploadQueueItem(field.name, item.id, { filename: event.target.value.replace(/[\\/]/g, '') })}
                                    className="mt-2 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                </div>
                                <div>
                                  <label className="text-sm font-medium text-slate-900">Related image name</label>
                                  <input
                                    type="text"
                                    value={item.label}
                                    onChange={(event) => updateUploadQueueItem(field.name, item.id, { label: event.target.value })}
                                    className="mt-2 w-full rounded-lg border border-slate-200/60 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeUploadQueueItem(field.name, item.id)}
                                className="rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition hover:bg-slate-50"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => uploadPendingImages(field.name)}
                            className="w-full rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
                          >
                            Upload queued images
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Selected images</p>
                    <p className="mt-1 text-xs text-slate-500">These images are already selected for this record.</p>
                    {selectedOptions.length === 0 ? (
                      <p className="mt-4 text-sm text-slate-500">No images selected yet.</p>
                    ) : (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        {selectedOptions.map((option) => (
                          <div key={option.value} className="rounded-xl border border-slate-200/60 bg-white p-3">
                            <div className="relative h-32 overflow-hidden rounded-lg bg-slate-100">
                              <img
                                src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                                alt={option.label}
                                className="h-full w-full object-cover"
                              />
                              <label className="absolute right-3 top-3 inline-flex items-center rounded-lg bg-white/90 p-2 shadow-sm">
                                <input
                                  type="checkbox"
                                  checked
                                  onChange={() => {
                                    const values = Array.isArray(value) ? [...value] : [];
                                    updateField(field.name, values.filter((id) => id !== option.value));
                                  }}
                                  className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                                />
                              </label>
                            </div>
                            <div className="mt-3 space-y-2">
                              <p className="truncate text-sm font-semibold text-slate-900">{option.label}</p>
                              <p className="text-xs text-slate-500">{option.filename ?? option.label}</p>
                              <button
                                type="button"
                                onClick={() => deleteImageFromLibrary(option.value, field.name)}
                                className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
                              >
                                Delete image
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
                <div className="space-y-4 rounded-xl border border-slate-200/60 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">Choose unselected gallery images.</p>
                    <p className="text-sm text-slate-500">{filteredOptions.length} available</p>
                  </div>

                  {filteredOptions.length === 0 ? (
                    <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-6 text-center">
                      <p className="text-sm text-slate-500">No matching gallery images found</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {pageOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateField(field.name, [...selectedValues, option.value])}
                            className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/60 bg-slate-50 text-left transition hover:border-brand-300"
                          >
                            <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                              <img
                                src={`${apiPrefix}/images/${encodeURIComponent(option.value)}`}
                                alt={option.label}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                              />
                              <div className="pointer-events-none absolute right-3 top-3 rounded-lg bg-white/90 p-2 shadow-sm">
                                <input
                                  type="checkbox"
                                  checked={false}
                                  readOnly
                                  className="h-4 w-4 rounded border-slate-300 text-brand-500"
                                />
                              </div>
                            </div>
                            <div className="p-4">
                              <p className="truncate text-sm font-semibold text-slate-900">{option.label}</p>
                              <p className="mt-2 text-xs text-slate-500">{(option as RelatedOption).filename ?? option.label}</p>
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-slate-500">
                          Showing {currentPage * imagePageSize + 1} – {Math.min((currentPage + 1) * imagePageSize, filteredOptions.length)} of {filteredOptions.length}
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          <button
                            type="button"
                            onClick={() => setImagePage((page) => Math.max(page - 1, 0))}
                            disabled={currentPage === 0}
                            className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Previous
                          </button>
                          <span className="font-semibold">{currentPage + 1} / {pageCount}</span>
                          <button
                            type="button"
                            onClick={() => setImagePage((page) => Math.min(page + 1, pageCount - 1))}
                            disabled={currentPage >= pageCount - 1}
                            className="rounded-lg px-3 py-1 font-medium transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="mt-2 space-y-2">
            {relationOptions.length > 0 ? (
              relationOptions.map((option) => {
                const selected = Array.isArray(value) ? value.includes(option.value) : false;
                return (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-slate-700">
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
                      className="h-4 w-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                    />
                    {option.label}
                  </label>
                );
              })
            ) : (
              <div className="text-sm text-slate-500">No options available yet.</div>
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
                  className="flex-1 rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  placeholder={field.itemLabel ?? 'Item text'}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(field.name, index)}
                  className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            )) : null}
            <button
              type="button"
              onClick={() => addArrayItem(field.name, '')}
              className="rounded-lg border border-brand-200/60 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-100"
            >
              Add {field.itemLabel ?? 'item'}
            </button>
          </div>
        );
      case 'objectArray':
        return (
          <div className="space-y-4 mt-3">
            {Array.isArray(value)
              ? value.map((item: any, index: number) => (
                  <div key={`${field.name}-${index}`} className="rounded-xl border border-slate-200/60 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-900">{field.itemLabel ?? 'Item'} {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(field.name, index)}
                        className="rounded-lg border border-rose-200/60 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition hover:bg-rose-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {field.itemFields?.map((childField) => (
                        <div key={childField.name}>
                          <label className="block text-sm font-medium text-slate-700">{childField.label}</label>
                          <input
                            type="text"
                            value={item[childField.name] ?? ''}
                            onChange={(event) => updateObjectArrayItem(field.name, index, childField.name, event.target.value)}
                            className="mt-2 w-full rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
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
              className="rounded-lg border border-brand-200/60 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-100"
            >
              Add {field.itemLabel ?? 'row'}
            </button>
          </div>
        );
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200/60 bg-gradient-to-br from-white to-slate-50/30 p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-3 py-1 text-xs font-semibold tracking-wide text-white shadow-sm">
              {mode === 'create' ? 'Create New' : 'Edit'}
            </div>
            <h2 className="text-3xl font-semibold text-slate-900">{schema.label}</h2>
            <p className="mt-2 text-sm text-slate-500">{schema.description}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push(siteName ? `/dashboard/websites/${siteName}` : '/dashboard/atlanticdunes')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Overview
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {loading ? (
          <div className="rounded-xl border border-slate-200/60 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center animate-pulse">
              <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600">Loading record...</p>
          </div>
        ) : (
          schema.fields.map((field) => (
            <div key={field.name} className="rounded-xl border border-slate-200/60 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <label htmlFor={field.name} className="text-sm font-semibold text-slate-900">
                    {field.label}
                  </label>
                  {field.required ? <span className="ml-2 text-xs font-medium text-rose-600">Required</span> : null}
                </div>
                {field.description ? <p className="text-sm text-slate-500">{field.description}</p> : null}
              </div>
              {renderField(field)}
            </div>
          ))
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
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
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/60 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50 hover:shadow"
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
