'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AtlanticDunesCollectionSchema,
  AtlanticDunesField,
  getCollectionSchema,
} from '../lib/atlanticdunes-schema';

type RelatedOption = { value: string; label: string; filename?: string };
type RelatedOptions = Record<string, Array<RelatedOption>>;

type Props = {
  collectionName: string;
  mode: 'create' | 'edit';
  itemId?: string;
};

type FormData = Record<string, any>;

const DEFAULT_IMAGE_PAGE_SIZE = 9;
const SMALL_SCREEN_IMAGE_PAGE_SIZE = 3;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
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

export default function AtlanticDunesForm({ collectionName, mode, itemId }: Props) {
  const router = useRouter();
  const schema = getCollectionSchema(collectionName);
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
        const response = await fetch(`/api/atlanticdunes/${collectionName}/${encodeURIComponent(itemId)}`, {
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
        setError(err instanceof Error ? err.message : 'Unable to load record');
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
          const response = await fetch(`/api/atlanticdunes/related/${rel}`, { credentials: 'include' });
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

  async function handleImageUpload(fieldName: string, files: FileList | File[]) {
    const fileArray = Array.isArray(files) ? files : Array.from(files);
    const imageFiles = fileArray.filter((file): file is File => file instanceof File && file.size > 0);
    if (imageFiles.length === 0) return;

    setUploadingImages(true);
    setError(null);
    setMessage(null);

    try {
      const uploadFormData = new FormData();
      imageFiles.forEach((file) => uploadFormData.append('images', file));

      const response = await fetch('/api/atlanticdunes/images', {
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
          ...uploaded.map((item: any) => ({ value: String(item._id), label: item.filename })),
          ...(prev.images ?? []),
        ],
      }));

      if (uploaded.length > 0) {
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
      }

      setMessage(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload image.');
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
      const response = await fetch(`/api/atlanticdunes/images/${encodeURIComponent(imageId)}`, {
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

      setMessage('Image deleted successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete image.');
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

      const response = await fetch(`/api/atlanticdunes/images/${encodeURIComponent(imageId)}`, {
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

      setMessage('Image replaced successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to replace image.');
    } finally {
      setUploadingImages(false);
    }
  }

  async function renameImageInLibrary(imageId: string, filename: string, label: string) {
    const fileName = filename.trim();
    const imageLabel = label.trim();
    if (!fileName && !imageLabel) {
      setError('Filename or related name must be provided.');
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

      const response = await fetch(`/api/atlanticdunes/images/${encodeURIComponent(imageId)}`, {
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
      setMessage('Image metadata updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to rename image.');
    } finally {
      setUploadingImages(false);
    }
  }

  useEffect(() => {
    if (!schema || mode !== 'create') return;
    const title = String(formData.title ?? '');
    const slugField = schema.fields.find((field) => field.type === 'slug');
    if (!slugField) return;
    const currentSlug = String(formData.slug ?? '');
    if (!currentSlug && title) {
      setFormData((prev) => ({ ...prev, slug: slugify(title) }));
    }
  }, [formData.title, mode, schema]);

  if (!schema) {
    return <div className="p-6 text-red-600">Unknown Atlantic Dunes collection: {collectionName}</div>;
  }

  function updateField(name: string, value: any) {
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      const url = mode === 'create' ? `/api/atlanticdunes/${collectionName}` : `/api/atlanticdunes/${collectionName}/${encodeURIComponent(itemId ?? String(formData._id))}`;
      const method = mode === 'create' ? 'POST' : 'PUT';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.message || 'Unable to save record');
      }
      setMessage('Saved successfully.');
      if (mode === 'create' && result.document?._id) {
        router.push(`/dashboard/atlanticdunes/${collectionName}/${encodeURIComponent(result.document._id)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save record');
    } finally {
      setSaving(false);
    }
  }

  function renderField(field: AtlanticDunesField) {
    const value = formData[field.name];
    const relationOptions = field.relation ? relatedOptions[field.relation.collection] || [] : field.options || [];

    switch (field.type) {
      case 'text':
      case 'slug':
      case 'date':
      case 'number':
        return (
          <input
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
            id={field.name}
            value={String(value ?? '')}
            onChange={(event) => updateField(field.name, field.type === 'number' ? Number(event.target.value) : event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            placeholder={field.placeholder}
          />
        );
      case 'textarea':
        return (
          <textarea
            id={field.name}
            value={String(value ?? '')}
            onChange={(event) => updateField(field.name, event.target.value)}
            rows={field.name === 'description' ? 6 : 4}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
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
        const selectedEdit = selectedImageOption
          ? imageEdits[selectedImageOption.value] ?? {
              filename: selectedImageOption.filename ?? selectedImageOption.label,
              label: selectedImageOption.label,
            }
          : undefined;
        const selectedFilenameParts = selectedEdit?.filename.split('.') ?? [''];
        const selectedExtension = selectedFilenameParts.length > 1 ? `.${selectedFilenameParts.pop()}` : '';
        const selectedBaseName = selectedFilenameParts.join('.');
        const isRenameEnabled = selectedEdit && selectedImageOption
          ? selectedEdit.filename !== (selectedImageOption.filename ?? selectedImageOption.label) || selectedEdit.label !== selectedImageOption.label
          : false;
        return (
          <>
            <select
              id={field.name}
              value={String(value ?? '')}
              onChange={(event) => updateField(field.name, event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="">Select {field.label}</option>
              {relationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.relation?.collection === 'images' ? (
              <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid gap-4 sm:grid-cols-[1.5fr_1fr]">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Upload image</p>
                    <p className="mt-1 text-sm text-slate-500">Add a new file and have it selected automatically.</p>
                    <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                      {uploadingImages ? 'Uploading…' : 'Upload image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const files = event.target.files;
                          if (files?.length) {
                            handleImageUpload(field.name, files);
                            event.target.value = '';
                          }
                        }}
                      />
                    </label>
                  </div>
                  {selectedImageOption ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-900">Selected image</p>
                      <p className="text-sm text-slate-500">Manage the currently selected image directly.</p>
                      <div className="mt-4 flex flex-col gap-3">
                        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                          <img
                            src={`/api/images/${encodeURIComponent(selectedImageOption.value)}`}
                            alt={selectedImageOption.label}
                            className="h-40 w-full object-cover"
                          />
                        </div>
                        <div className="grid gap-3">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                              {uploadingImages ? 'Replacing…' : 'Replace image'}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    replaceImageInLibrary(field.name, selectedImageOption.value, file);
                                    event.target.value = '';
                                  }
                                }}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => deleteImageFromLibrary(selectedImageOption.value, field.name)}
                              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                              disabled={uploadingImages}
                            >
                              Delete image
                            </button>
                          </div>
                          <div className="rounded-3xl border border-slate-200 bg-white p-3">
                            <div className="grid gap-3">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="w-full">
                                  <label className="text-sm font-medium text-slate-900">Filename</label>
                                  <div className="mt-2 flex gap-2">
                                    <input
                                      type="text"
                                      value={selectedBaseName}
                                      onChange={(event) =>
                                        setImageEdits((prev) => ({
                                          ...prev,
                                          [selectedImageOption.value]: {
                                            filename: `${event.target.value}${selectedExtension}`,
                                            label: selectedEdit?.label ?? selectedImageOption.label,
                                          },
                                        }))
                                      }
                                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                    />
                                    <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-600">{selectedExtension || '.png'}</span>
                                  </div>
                                </div>
                                <div className="w-full">
                                  <label className="text-sm font-medium text-slate-900">Related image name</label>
                                  <input
                                    type="text"
                                    value={selectedEdit?.label ?? selectedImageOption.label}
                                    onChange={(event) =>
                                      setImageEdits((prev) => ({
                                        ...prev,
                                        [selectedImageOption.value]: {
                                          filename: selectedEdit?.filename ?? selectedImageOption.filename ?? selectedImageOption.label,
                                          label: event.target.value,
                                        },
                                      }))
                                    }
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => renameImageInLibrary(selectedImageOption.value, selectedEdit?.filename ?? selectedImageOption.filename ?? selectedImageOption.label, selectedEdit?.label ?? selectedImageOption.label)}
                                disabled={!isRenameEnabled || uploadingImages}
                                className="rounded-2xl border border-brand-600 bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Save image metadata
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        );
      }
      case 'multiSelect': {
        const selectedValues = Array.isArray(value) ? value : [];
        const isImageGallery = field.relation?.collection === 'images';
        const filteredOptions = isImageGallery
          ? relationOptions.filter((option) => option.label.toLowerCase().includes(imageSearch.toLowerCase()))
          : relationOptions;

        const pageCount = isImageGallery ? Math.max(1, Math.ceil(filteredOptions.length / imagePageSize)) : 1;
        const currentPage = Math.min(imagePage, pageCount - 1);
        const pageOptions = isImageGallery
          ? filteredOptions.slice(currentPage * imagePageSize, currentPage * imagePageSize + imagePageSize)
          : filteredOptions;

        if (isImageGallery) {
          return (
            <div className="space-y-4 mt-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Gallery images</p>
                  <p className="text-sm text-slate-500">Browse and select one or more image assets from the media library.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="search"
                    value={imageSearch}
                    onChange={(event) => setImageSearch(event.target.value)}
                    placeholder="Search images..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 sm:w-64"
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700">
                    {uploadingImages ? 'Uploading…' : 'Upload images'}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="sr-only"
                      onChange={(event) => {
                        const files = event.target.files;
                        if (files?.length) {
                          handleImageUpload(field.name, files);
                          event.target.value = '';
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {filteredOptions.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No matching gallery images found.</div>
              ) : (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-slate-500">
                      Showing {currentPage * imagePageSize + 1} – {Math.min((currentPage + 1) * imagePageSize, filteredOptions.length)} of {filteredOptions.length} images
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-3xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <button
                        type="button"
                        onClick={() => setImagePage((page) => Math.max(page - 1, 0))}
                        disabled={currentPage === 0}
                        className="rounded-full px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <span className="font-semibold">{currentPage + 1} / {pageCount}</span>
                      <button
                        type="button"
                        onClick={() => setImagePage((page) => Math.min(page + 1, pageCount - 1))}
                        disabled={currentPage >= pageCount - 1}
                        className="rounded-full px-3 py-1 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {pageOptions.map((option) => {
                      const selected = selectedValues.includes(option.value);
                      return (
                        <div
                          key={option.value}
                          className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white transition focus-within:ring-2 focus-within:ring-brand-500/20 ${
                            selected ? 'border-brand-500 shadow-[0_0_0_4px_rgba(59,130,246,0.12)]' : 'border-slate-200 hover:border-brand-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              const values = Array.isArray(value) ? [...value] : [];
                              const index = values.indexOf(option.value);
                              if (index === -1) {
                                values.push(option.value);
                              } else {
                                values.splice(index, 1);
                              }
                              updateField(field.name, values);
                            }}
                            className="text-left"
                          >
                            <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                              <img
                                src={`/api/images/${encodeURIComponent(option.value)}`}
                                alt={option.label}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                            </div>
                            <div className="flex flex-col gap-2 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-slate-900">{option.label}</p>
                                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${selected ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                  {selected ? 'Selected' : 'Tap to select'}
                                </span>
                              </div>
                            </div>
                          </button>
                          {selected ? (
                            <div className="border-t border-slate-200 bg-slate-50 p-4">
                              <div className="grid gap-3">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">
                                    Replace
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="sr-only"
                                      onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        if (file) {
                                          replaceImageInLibrary(field.name, option.value, file);
                                          event.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => deleteImageFromLibrary(option.value, field.name)}
                                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                                    disabled={uploadingImages}
                                  >
                                    Delete
                                  </button>
                                </div>
                                <div className="rounded-3xl border border-slate-200 bg-white p-3">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div>
                                      <label className="text-sm font-medium text-slate-900">Filename</label>
                                      <div className="mt-2 flex gap-2">
                                        <input
                                          type="text"
                                          value={(imageEdits[option.value]?.filename ?? (option as RelatedOption).filename ?? option.label).replace(/(\.[^/.]+)$/, '')}
                                          onChange={(event) => {
                                            const current = imageEdits[option.value] ?? {
                                              filename: (option as RelatedOption).filename ?? option.label,
                                              label: option.label,
                                            };
                                            const extension = (current.filename.match(/(\.[^/.]+)$/) || [''])[0];
                                            setImageEdits((prev) => ({
                                              ...prev,
                                              [option.value]: {
                                                filename: `${event.target.value}${extension}`,
                                                label: current.label,
                                              },
                                            }));
                                          }}
                                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                        />
                                        <span className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-600">{(imageEdits[option.value]?.filename ?? (option as RelatedOption).filename ?? option.label).match(/(\.[^/.]+)$/)?.[0] ?? '.png'}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium text-slate-900">Related image name</label>
                                      <input
                                        type="text"
                                        value={imageEdits[option.value]?.label ?? option.label}
                                        onChange={(event) => {
                                          const current = imageEdits[option.value] ?? {
                                            filename: (option as RelatedOption).filename ?? option.label,
                                            label: option.label,
                                          };
                                          setImageEdits((prev) => ({
                                            ...prev,
                                            [option.value]: {
                                              filename: current.filename,
                                              label: event.target.value,
                                            },
                                          }));
                                        }}
                                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = imageEdits[option.value] ?? {
                                        filename: (option as RelatedOption).filename ?? option.label,
                                        label: option.label,
                                      };
                                      renameImageInLibrary(option.value, current.filename, current.label);
                                    }}
                                    disabled={uploadingImages}
                                    className="mt-3 rounded-2xl border border-brand-600 bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    Save image metadata
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {selectedValues.length} image{selectedValues.length === 1 ? '' : 's'} selected.
              </div>
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
          <div className="space-y-3 mt-2">
            {Array.isArray(value) ? value.map((item: string, index: number) => (
              <div key={`${field.name}-${index}`} className="flex gap-2">
                <input
                  type="text"
                  value={item ?? ''}
                  onChange={(event) => updateArrayItem(field.name, index, event.target.value)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
                  placeholder={field.itemLabel ?? 'Item text'}
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(field.name, index)}
                  className="rounded-2xl border border-slate-200 bg-rose-50 px-3 text-sm text-rose-700 transition hover:bg-rose-100"
                >
                  Remove
                </button>
              </div>
            )) : null}
            <button
              type="button"
              onClick={() => addArrayItem(field.name, '')}
              className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              Add {field.itemLabel ?? 'item'}
            </button>
          </div>
        );
      case 'objectArray':
        return (
          <div className="space-y-4 mt-2">
            {Array.isArray(value)
              ? value.map((item: any, index: number) => (
                  <div key={`${field.name}-${index}`} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-900">{field.itemLabel ?? 'Item'} {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => removeArrayItem(field.name, index)}
                        className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-1 text-sm text-rose-700 transition hover:bg-rose-100"
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
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
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
              className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-100"
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
    <div className="space-y-8 p-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">{mode === 'create' ? 'Create' : 'Edit'} {schema.label}</h2>
            <p className="mt-2 text-sm text-slate-600">{schema.description}</p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/atlanticdunes')}
            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Back to collections
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-sm shadow-rose-900/5">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700 shadow-sm shadow-emerald-900/5">{message}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">Loading record…</div>
        ) : (
          schema.fields.map((field) => (
            <div key={field.name} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
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
            className="rounded-3xl bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-3xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
