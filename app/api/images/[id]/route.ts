import { NextRequest } from 'next/server';
import { getAtlanticDunesDb } from '../../../../lib/db';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const db = await getAtlanticDunesDb();

  let image = null;
  try {
    const objectId = new ObjectId(id);
    image = await db.collection('images').findOne({ _id: objectId }, { projection: { filename: 1, contentType: 1, data: 1 } });
  } catch {
    // invalid ObjectId, fall back to string-based lookup
  }

  if (!image) {
    image = await db.collection('images').findOne({ _id: id as any }, { projection: { filename: 1, contentType: 1, data: 1 } });
  }

  if (!image || !image.data) {
    return new Response(JSON.stringify({ message: 'Image not found.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  const body = image.data.buffer ?? image.data;
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': image.contentType || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${image.filename}"`,
    },
  });
}
