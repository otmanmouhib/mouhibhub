import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getAtlanticDunesDb } from '../../../../lib/db';

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

export async function POST(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return badRequest('Invalid upload request.');
  }

  const files = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    return badRequest('No image files provided.');
  }

  const db = await getAtlanticDunesDb();
  const uploadedItems: Array<{ _id: string; filename: string; label: string; contentType: string }> = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const result = await db.collection('images').insertOne({
      filename: file.name,
      label: file.name,
      contentType: file.type || 'application/octet-stream',
      data: buffer,
      createdAt: new Date(),
    });

    uploadedItems.push({
      _id: String(result.insertedId),
      filename: file.name,
      label: file.name,
      contentType: file.type || 'application/octet-stream',
    });
  }

  return NextResponse.json({ ok: true, items: uploadedItems }, { status: 201 });
}
