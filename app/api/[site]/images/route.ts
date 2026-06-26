import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getSiteDb, isSupportedSite } from '../../../../lib/site';

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

function slugify(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function generateUniqueSlug(filename: string, index: number) {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const slug = slugify(nameWithoutExt) || 'image';
  return index > 0 ? `${slug}-${index}` : slug;
}

export async function POST(request: NextRequest, context: { params: Promise<{ site: string }> }) {
  const { site } = await context.params;
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  if (!token || !verifyAuthToken(token)) {
    return unauthorized();
  }

  if (!isSupportedSite(site)) {
    return new NextResponse(JSON.stringify({ message: 'Website not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return badRequest('Invalid upload request.');
  }

  const files = formData.getAll('images').filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    return badRequest('No image files provided.');
  }

  const db = await getSiteDb(site);
  const uploadedItems: Array<{ _id: string; filename: string; label: string; contentType: string }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const slug = generateUniqueSlug(file.name, i);
    const result = await db.collection('images').insertOne({
      slug,
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
