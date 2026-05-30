import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import {
  atlanticDunesCollections,
  isAtlanticDunesCollection,
  listAtlanticDunesDocuments,
  resolveDocumentId,
  createAtlanticDunesDocument,
  collectionMetadata,
} from '../../../../lib/db';

function unauthorized() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(message: string) {
  return new NextResponse(JSON.stringify({ message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  const params = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const collection = params.collection;
  if (!isAtlanticDunesCollection(collection)) {
    return new NextResponse(JSON.stringify({ message: 'Collection not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const items = await listAtlanticDunesDocuments(collection);
  return NextResponse.json({ collection, label: collectionMetadata[collection].label, description: collectionMetadata[collection].description, items });
}

export async function POST(request: NextRequest, context: { params: Promise<{ collection: string }> }) {
  const params = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const collection = params.collection;
  if (!isAtlanticDunesCollection(collection)) {
    return new NextResponse(JSON.stringify({ message: 'Collection not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return badRequest('Request body must be a JSON object.');
  }

  const id = resolveDocumentId(collection, body);
  if (!id) {
    return badRequest(`Missing required id field. Add a ${collectionMetadata[collection].idField} or _id property.`);
  }

  const payload = { ...body, _id: id };

  try {
    const document = await createAtlanticDunesDocument(collection, payload as any);
    return new NextResponse(JSON.stringify({ ok: true, document }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: (error as Error).message || 'Unable to create document' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
