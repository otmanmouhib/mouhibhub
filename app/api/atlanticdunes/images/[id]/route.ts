import { NextRequest, NextResponse } from 'next/server';
import { Filter, GridFSBucket, ObjectId } from 'mongodb';
import { verifyAuthToken } from '../../../../../lib/auth';
import { getAtlanticDunesDb } from '../../../../../lib/db';

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

function resolveObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

function buildImageFilter(id: string): Filter<any> {
  const objectId = resolveObjectId(id);
  if (objectId) {
    return { $or: [{ _id: objectId }, { _id: id }] } as Filter<any>;
  }
  return { _id: id } as Filter<any>;
}

function buildContentBuffer(data: any): Buffer {
  if (Buffer.isBuffer(data)) return data;
  if (data?.buffer) return Buffer.from(data.buffer);
  return Buffer.from(data);
}

function resolveRedirectUrl(request: NextRequest, src: string): string | null {
  const trimmedSrc = src.trim();
  if (!trimmedSrc) return null;
  try {
    return new URL(trimmedSrc, request.url).href;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const db = await getAtlanticDunesDb();
  const filter = buildImageFilter(id);
  const document = await db.collection('images').findOne(filter);

  if (!document) {
    return new NextResponse(JSON.stringify({ message: 'Image not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (typeof document.src === 'string' && document.src.trim() !== '') {
    const redirectUrl = resolveRedirectUrl(request, document.src);
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (document.data) {
    const buffer = buildContentBuffer(document.data);
    return new NextResponse(buffer, {
      headers: { 'Content-Type': document.contentType || 'application/octet-stream' },
    });
  }

  if (document.fileId) {
    const fileId = resolveObjectId(String(document.fileId));
    if (fileId) {
      const bucket = new GridFSBucket(await getAtlanticDunesDb(), { bucketName: 'images' });
      const stream = bucket.openDownloadStream(fileId);
      return new NextResponse(stream as unknown as BodyInit, {
        headers: { 'Content-Type': document.contentType || 'application/octet-stream' },
      });
    }
  }

  return new NextResponse(JSON.stringify({ message: 'Image data not available.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const filter = buildImageFilter(id);

  const db = await getAtlanticDunesDb();
  const result = await db.collection('images').deleteOne(filter);
  if (result.deletedCount === 0) {
    return new NextResponse(JSON.stringify({ message: 'Image not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return badRequest('Invalid request body.');
  }

  const file = formData.get('image');
  const filename = String(formData.get('filename') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();

  const db = await getAtlanticDunesDb();
  const filter = buildImageFilter(id);
  const update: Record<string, any> = { updatedAt: new Date() };

  if (file instanceof File && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    update.filename = file.name || filename || 'image';
    update.contentType = file.type || 'application/octet-stream';
    update.data = buffer;
    if (label) update.label = label;
  } else if (filename || label) {
    if (filename) update.filename = filename;
    if (label) update.label = label;
  } else {
    return badRequest('No replacement image, filename or related name provided.');
  }

  const result = await db.collection('images').findOneAndUpdate(
    filter,
    { $set: update },
    { returnDocument: 'after' },
  );

  if (!result.value) {
    return new NextResponse(JSON.stringify({ message: 'Image not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return NextResponse.json({ ok: true, item: { _id: String(result.value._id), filename: result.value.filename, label: result.value.label, contentType: result.value.contentType } });
}
