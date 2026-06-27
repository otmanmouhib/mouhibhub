import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SUPPORTED_DBS = new Set(['mouhibhub', 'atlanticdunes', 'adrobiofarm']);

function unauthorizedResponse() {
  return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}

function badRequestResponse(message: string) {
  return new NextResponse(JSON.stringify({ message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

function notFoundResponse() {
  return new NextResponse(JSON.stringify({ message: 'Contact not found.' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload?.email) {
    return null;
  }

  return payload;
}

function parseContactId(id: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const contactId = parseContactId(id);

  if (!contactId) {
    return badRequestResponse('Invalid contact id.');
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const status = typeof body?.status === 'string' ? body.status.trim() : '';

  if (!name && !email && !message && !phone && !status) {
    return badRequestResponse('Provide at least one field to update.');
  }

  if (email && !EMAIL_REGEX.test(email)) {
    return badRequestResponse('Please provide a valid email address.');
  }

  const dbName = request.nextUrl.searchParams.get('db') ?? 'mouhibhub';
  if (!SUPPORTED_DBS.has(dbName)) {
    return badRequestResponse('Invalid database selected for contacts.');
  }

  const db = await getDb(dbName);
  const existing = await db.collection('contacts').findOne({ _id: contactId });

  if (!existing) {
    return notFoundResponse();
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
    updatedBy: auth.email,
  };

  if (name) {
    updates.name = name;
  }

  if (email) {
    updates.email = email;
  }

  if (message) {
    updates.message = message;
  }

  if (phone) {
    updates.phone = phone;
  }

  if (status) {
    updates.status = status;
  }

  await db.collection('contacts').updateOne({ _id: contactId }, { $set: updates });

  const updated = await db.collection('contacts').findOne({ _id: contactId });

  return new NextResponse(JSON.stringify({
    ok: true,
    contact: updated
      ? {
          ...updated,
          _id: String(updated._id),
        }
      : null,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const { id } = await context.params;
  const contactId = parseContactId(id);

  if (!contactId) {
    return badRequestResponse('Invalid contact id.');
  }

  const dbName = request.nextUrl.searchParams.get('db') ?? 'mouhibhub';
  if (!SUPPORTED_DBS.has(dbName)) {
    return badRequestResponse('Invalid database selected for contacts.');
  }

  const db = await getDb(dbName);
  const existing = await db.collection('contacts').findOne({ _id: contactId });

  if (!existing) {
    return notFoundResponse();
  }

  await db.collection('contacts').deleteOne({ _id: contactId });

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
