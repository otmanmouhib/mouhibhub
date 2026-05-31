import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getAtlanticDunesDb, collectionMetadata } from '../../../lib/db';

function unauthorized() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const db = await getAtlanticDunesDb();
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
        description:
          metadata?.description ?? 'Available collection in the `atlanticdunes` database.',
        count,
        managed: Boolean(metadata),
      };
    }),
  );

  return NextResponse.json({ collections });
}
