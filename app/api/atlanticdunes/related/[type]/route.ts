import { NextRequest, NextResponse } from 'next/server';
import { getAtlanticDunesDb } from 'lib/db';

async function getParams(context: { params: Promise<{ type: string }> }) {
  return await context.params;
}

function notFound() {
  return new NextResponse(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const { type } = await getParams(context);
  const db = await getAtlanticDunesDb();

  if (type === 'images') {
    const items = await db
      .collection('images')
      .find({}, { projection: { _id: 1, filename: 1, contentType: 1, createdAt: 1 } })
      .sort({ _id: 1 })
      .toArray();

    return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
  }

  if (type === 'domains') {
    const domainMap = new Map<string, { _id: string; slug?: string; label?: string; description?: string }>();
    const domainsCollectionExists = await db.listCollections({ name: 'domains' }, { nameOnly: true }).hasNext();

    if (domainsCollectionExists) {
      const items = await db
        .collection('domains')
        .find({}, { projection: { _id: 1, label: 1, slug: 1, id: 1, description: 1 } })
        .sort({ _id: 1 })
        .toArray();
      items.forEach((item) => {
        const value = String(item.slug ?? item.id ?? item._id ?? item.label ?? '');
        const label = item.label ?? item.slug ?? item.id ?? value;
        if (value) {
          domainMap.set(value, { _id: value, slug: item.slug, label, description: item.description ?? undefined });
        }
      });
    }

    const poleExists = await db.listCollections({ name: 'poles' }, { nameOnly: true }).hasNext();
    if (poleExists) {
      const poles = await db.collection('poles').find({}, { projection: { domains: 1 } }).toArray();
      poles.forEach((pole) => {
        if (!Array.isArray(pole.domains)) return;
        pole.domains.forEach((domain: any) => {
          const value = String(domain.slug ?? domain.id ?? domain._id ?? domain.label ?? domain);
          const label = domain.label ?? domain.slug ?? domain.id ?? value;
          const description = domain.description ?? undefined;
          if (value && !domainMap.has(value)) {
            domainMap.set(value, { _id: value, slug: domain.slug, label, description });
          }
        });
      });
    }

    return NextResponse.json({ items: Array.from(domainMap.values()) });
  }

  if (!['poles', 'newsCategories', 'boutiqueCategories'].includes(type)) {
    return notFound();
  }

  const projection: any = { _id: 1, label: 1, slug: 1, id: 1, subcategories: 1 };
  if (type === 'poles') {
    projection.domains = 1;
  }

  const items = await db
    .collection(type)
    .find({}, { projection })
    .sort({ _id: 1 })
    .toArray();

  return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}
