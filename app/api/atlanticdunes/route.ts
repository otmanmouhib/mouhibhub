import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { atlanticDunesCollections, collectionMetadata, countAtlanticDunesDocuments } from '../../../lib/db';

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

  const collections = await Promise.all(
    atlanticDunesCollections.map(async (collection) => ({
      name: collection,
      label: collectionMetadata[collection].label,
      description: collectionMetadata[collection].description,
      count: await countAtlanticDunesDocuments(collection),
    })),
  );

  return NextResponse.json({ collections });
}
