import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getSiteDb, isSupportedSite } from '../../../lib/site';
import { collectionMetadata } from '../../../lib/db';

function unauthorized() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFound() {
  return new NextResponse(JSON.stringify({ message: 'Website not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ site: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const { site } = await context.params;
  if (!isSupportedSite(site)) {
    return notFound();
  }

  const db = await getSiteDb(site);
  const collectionItems = await db.listCollections({}, { nameOnly: true }).toArray();
  const hiddenCollections = new Set(['images.files', 'images.chunks']);
  const filteredCollections = collectionItems.filter(
    (collection) => !collection.name.startsWith('system.') && !hiddenCollections.has(collection.name),
  );

  const collections = await Promise.all(
    filteredCollections.map(async (collection) => {
      const name = collection.name;
      const count = await db.collection(name).countDocuments();
      const metadata = collectionMetadata[name as keyof typeof collectionMetadata];

      return {
        name,
        label: metadata?.label ?? name,
        description: metadata?.description ?? 'Available collection in the `' + site + '` database.',
        count,
        managed: Boolean(metadata),
      };
    }),
  );

  return NextResponse.json({ collections });
}
