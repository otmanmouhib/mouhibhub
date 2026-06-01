import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getSiteDb, isSupportedSite } from '../../../../lib/site';
import { isAtlanticDunesCollection, collectionMetadata, resolveDocumentId } from '../../../../lib/db';

function unauthorized() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFound() {
  return new NextResponse(JSON.stringify({ message: 'Collection not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequest(message: string) {
  return new NextResponse(JSON.stringify({ message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ site: string; collection: string }> }) {
  const { site, collection } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site) || !isAtlanticDunesCollection(collection)) {
    return notFound();
  }

  const db = await getSiteDb(site);
  const items = await db
    .collection(collection)
    .find({}, { sort: { _id: 1 } })
    .limit(200)
    .toArray();

  return NextResponse.json({ collection, label: collectionMetadata[collection].label, description: collectionMetadata[collection].description, items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}

export async function POST(request: NextRequest, context: { params: Promise<{ site: string; collection: string }> }) {
  const { site, collection } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site) || !isAtlanticDunesCollection(collection)) {
    return notFound();
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
    const db = await getSiteDb(site);
    const existing = await db.collection(collection).findOne({ _id: id as any });
    if (existing) {
      throw new Error('A document with that identifier already exists.');
    }
    await db.collection(collection).insertOne(payload);
    return new NextResponse(JSON.stringify({ ok: true, document: payload }), {
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

export async function DELETE(request: NextRequest, context: { params: Promise<{ site: string; collection: string }> }) {
  const { site, collection } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site) || !isAtlanticDunesCollection(collection)) {
    return notFound();
  }

  const db = await getSiteDb(site);
  const result = await db.collection(collection).deleteMany({});

  return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
}
