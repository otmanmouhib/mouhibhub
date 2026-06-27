import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getContactsFromDb, getDb } from '../../../lib/mongodb';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sources = [
  { db: 'atlanticdunes' },
  { db: 'adrobiofarm' },
  { db: 'mouhibhub' },
];

function isSupportedDb(dbName: string) {
  return sources.some((source) => source.db === dbName);
}

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

function conflictResponse(message: string) {
  return new NextResponse(JSON.stringify({ message }), {
    status: 409,
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

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const selectedDb = request.nextUrl.searchParams.get('db');
  const sourceList = selectedDb
    ? sources.filter((source) => source.db === selectedDb)
    : sources;

  const results = await Promise.all(
    sourceList.map(async (source) => ({
      db: source.db,
      contacts: await getContactsFromDb(source.db),
    })),
  );

  return NextResponse.json({ sources: results });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth) {
    return unauthorizedResponse();
  }

  const dbName = request.nextUrl.searchParams.get('db') ?? 'mouhibhub';
  if (!isSupportedDb(dbName)) {
    return badRequestResponse('Invalid database selected for contacts.');
  }

  const body = await request.json().catch(() => null);
  const name = String(body?.name ?? '').trim();
  const email = String(body?.email ?? '').trim().toLowerCase();
  const message = String(body?.message ?? '').trim();
  const phone = String(body?.phone ?? '').trim();
  const status = String(body?.status ?? '').trim() || 'New';

  if (!name) {
    return badRequestResponse('Name is required.');
  }

  if (!EMAIL_REGEX.test(email)) {
    return badRequestResponse('Please provide a valid email address.');
  }

  if (!message) {
    return badRequestResponse('Message is required.');
  }

  const db = await getDb(dbName);
  const now = new Date().toISOString();

  const duplicate = await db.collection('contacts').findOne({
    email,
    message,
  });
  if (duplicate) {
    return conflictResponse('A similar contact submission already exists.');
  }

  const result = await db.collection('contacts').insertOne({
    name,
    email,
    message,
    phone,
    status,
    createdAt: now,
    updatedAt: now,
    createdBy: auth.email,
  });

  const created = await db.collection('contacts').findOne({ _id: result.insertedId });

  return new NextResponse(JSON.stringify({
    ok: true,
    contact: created
      ? {
          ...created,
          _id: String(created._id),
        }
      : null,
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
