import { NextRequest, NextResponse } from 'next/server';
import { getAtlanticDunesDb } from 'lib/db';

async function getParams(context: { params: Promise<{ type: string }> }) {
  return await context.params;
}

function notFound() {
  return new NextResponse(JSON.stringify({ message: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ type: string }> }) {
  const { type } = await getParams(context);
  const db = await getAtlanticDunesDb();

  if (type === 'images') {
    const items = await db
      .collection('images')
      .find({}, { projection: { _id: 1, filename: 1, contentType: 1, createdAt: 1 } })
      .sort({ _id: 1 })
      .toArray();

    return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
  }

  if (!['poles', 'domains', 'newsCategories'].includes(type)) {
    return notFound();
  }

  const items = await db
    .collection(type)
    .find({}, { projection: { _id: 1, label: 1, slug: 1, id: 1 } })
    .sort({ _id: 1 })
    .toArray();

  return NextResponse.json({ items: items.map((item) => ({ ...item, _id: String(item._id) })) });
}
