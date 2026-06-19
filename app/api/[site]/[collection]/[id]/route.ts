import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { verifyAuthToken } from '../../../../../lib/auth';
import { getSiteDb, isSupportedSite } from '../../../../../lib/site';
import { isAtlanticDunesCollection, resolveDocumentId } from '../../../../../lib/db';

function unauthorized() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFound(message = 'Not found') {
  return new NextResponse(JSON.stringify({ message }), {
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

function buildDocumentQuery(id: string) {
  const query = { _id: id as any };
  if (ObjectId.isValid(id)) {
    return { $or: [query, { _id: new ObjectId(id) }] };
  }
  return query;
}

export async function GET(request: NextRequest, context: { params: Promise<{ site: string; collection: string; id: string }> }) {
  const { site, collection, id } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site) || !isAtlanticDunesCollection(collection)) {
    return notFound();
  }

  const db = await getSiteDb(site);
  const document = await db.collection(collection).findOne(buildDocumentQuery(id));

  if (!document) {
    return notFound('Document not found');
  }

  return NextResponse.json({ collection, document: { ...document, _id: String(document._id) } });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ site: string; collection: string; id: string }> }) {
  const { site, collection, id } = await context.params;
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

  const db = await getSiteDb(site);
  const query = buildDocumentQuery(id);
  const existing = await db.collection(collection).findOne(query);
  if (!existing) {
    return notFound('Document not found');
  }

  const payload = {
    ...body,
    _id: existing._id,
    createdAt: existing.createdAt ?? body.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, any>;
  if (collection === 'poles') {
    delete payload.icon;
    delete payload.color;
  }
  const result = await db.collection(collection).replaceOne(query, payload, { upsert: false });
  if (result.matchedCount === 0) {
    return notFound('Document not found');
  }

  return NextResponse.json({ ok: true, document: payload });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ site: string; collection: string; id: string }> }) {
  const { site, collection, id } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site) || !isAtlanticDunesCollection(collection)) {
    return notFound();
  }

  const db = await getSiteDb(site);
  const query = { _id: id as any };
  if (ObjectId.isValid(id)) {
    const objectId = new ObjectId(id);
    const result = await db.collection(collection).deleteOne({ $or: [query, { _id: objectId }] });
    if (result.deletedCount === 0) {
      return notFound('Document not found');
    }
    return NextResponse.json({ ok: true });
  }

  const result = await db.collection(collection).deleteOne(query);
  if (result.deletedCount === 0) {
    return notFound('Document not found');
  }

  return NextResponse.json({ ok: true });
}
