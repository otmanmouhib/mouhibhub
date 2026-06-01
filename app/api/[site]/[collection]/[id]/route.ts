import { NextRequest, NextResponse } from 'next/server';
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
  const document = await db.collection(collection).findOne({ _id: id as any });

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

  const payload = { ...body, _id: resolveDocumentId(collection, body) ?? id };

  const db = await getSiteDb(site);
  const result = await db.collection(collection).replaceOne({ _id: id as any }, payload, { upsert: false });
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
  const result = await db.collection(collection).deleteOne({ _id: id as any });
  if (result.deletedCount === 0) {
    return notFound('Document not found');
  }

  return NextResponse.json({ ok: true });
}
