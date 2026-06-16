import { NextRequest, NextResponse } from 'next/server';
import { getSiteDb, isSupportedSite } from '../../../../../lib/site';

async function getParams(context: { params: Promise<{ type: string; site: string }> }) {
  return await context.params;
}

function notFound() {
  return new NextResponse(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ type: string; site: string }> }) {
  const { type, site } = await getParams(context);
  if (!isSupportedSite(site)) {
    return notFound();
  }

  const db = await getSiteDb(site);

  if (type === 'images') {
    const items = await db
      .collection('images')
      .find({}, { projection: { _id: 1, filename: 1, contentType: 1, createdAt: 1 } })
      .sort({ _id: 1 })
      .toArray();

    return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
  }

  if (type === 'domains') {
    const domainsCollectionExists = await db.listCollections({ name: 'domains' }, { nameOnly: true }).hasNext();
    if (domainsCollectionExists) {
      const items = await db
        .collection('domains')
        .find({}, { projection: { _id: 1, label: 1, slug: 1, id: 1 } })
        .sort({ _id: 1 })
        .toArray();
      return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
    }

    const poleExists = await db.listCollections({ name: 'poles' }, { nameOnly: true }).hasNext();
    if (!poleExists) {
      return NextResponse.json({ items: [] });
    }

    const poles = await db.collection('poles').find({}, { projection: { domains: 1 } }).toArray();
    const domainMap = new Map<string, { _id: string; slug?: string; label?: string; description?: string }>();

    poles.forEach((pole) => {
      if (!Array.isArray(pole.domains)) return;
      pole.domains.forEach((domain: any) => {
        const value = String(domain.slug ?? domain.id ?? domain._id ?? domain.label ?? domain);
        const label = domain.label ?? domain.slug ?? domain.id ?? value;
        const description = domain.description ?? undefined;
        if (!domainMap.has(value)) {
          domainMap.set(value, { _id: value, slug: domain.slug, label, description });
        }
      });
    });

    return NextResponse.json({ items: Array.from(domainMap.values()) });
  }

  if (!['poles', 'newsCategories', 'boutiqueCategories'].includes(type)) {
    return notFound();
  }

  const items = await db
    .collection(type)
    .find({}, { projection: { _id: 1, label: 1, slug: 1, id: 1, subcategories: 1 } })
    .sort({ _id: 1 })
    .toArray();

  return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}
