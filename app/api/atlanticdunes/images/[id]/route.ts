import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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

async function resolveObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const { id } = await context.params;
  const objectId = await resolveObjectId(id);
  if (!objectId) {
    return badRequest('Invalid image id.');
  }

  const db = await getAtlanticDunesDb();
  const result = await db.collection('images').deleteOne({ _id: objectId });
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
  const objectId = await resolveObjectId(id);
  if (!objectId) {
    return badRequest('Invalid image id.');
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return badRequest('Invalid request body.');
  }

  const file = formData.get('image');
  const filename = String(formData.get('filename') ?? '').trim();
  const label = String(formData.get('label') ?? '').trim();

  const db = await getAtlanticDunesDb();
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
    { _id: objectId },
    { $set: update },
    { returnDocument: 'after' },
  );

  if (!result.value) {
    return new NextResponse(JSON.stringify({ message: 'Image not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return NextResponse.json({ ok: true, item: { _id: String(result.value._id), filename: result.value.filename, label: result.value.label, contentType: result.value.contentType } });
}
