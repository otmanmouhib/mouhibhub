'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';

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

export default function SiteManagementPage() {
  const params = useParams();
  const rawPage = params?.page;
  const pageKey = Array.isArray(rawPage) ? rawPage.join('/') : rawPage ?? '';

  const metadata = useMemo(() => pageMetadata[pageKey], [pageKey]);

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
