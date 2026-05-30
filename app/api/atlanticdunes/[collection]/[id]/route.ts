import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../../lib/auth';
import {
  isAtlanticDunesCollection,
  getAtlanticDunesDocument,
  updateAtlanticDunesDocument,
  deleteAtlanticDunesDocument,
  resolveDocumentId,
  collectionMetadata,
} from '../../../../../lib/db';

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

export async function GET(request: NextRequest, context: { params: Promise<{ collection: string; id: string }> }) {
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

  const document = await getAtlanticDunesDocument(collection, params.id);
  if (!document) {
    return new NextResponse(JSON.stringify({ message: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ collection, document });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ collection: string; id: string }> }) {
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

  const id = resolveDocumentId(collection, body) || params.id;
  const payload = { ...body, _id: id };

  try {
    const document = await updateAtlanticDunesDocument(collection, params.id, payload as any);
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return new NextResponse(JSON.stringify({ message: (error as Error).message || 'Unable to update document' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ collection: string; id: string }> }) {
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

  const deleted = await deleteAtlanticDunesDocument(collection, params.id);
  if (!deleted) {
    return new NextResponse(JSON.stringify({ message: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json({ ok: true });
}
