import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { verifyAuthToken } from '../../../lib/auth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(['admin', 'pending']);

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload?.email) {
    return { ok: false as const, response: new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }) };
  }

  const db = await getDb('mouhibhub');
  const currentUser = await db.collection('users').findOne({ email: payload.email });

  if (!currentUser || currentUser.role !== 'admin') {
    return { ok: false as const, response: new NextResponse(JSON.stringify({ message: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }) };
  }

  return {
    ok: true as const,
    db,
    currentUser,
  };
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const db = admin.db;

  const users = await db
    .collection('users')
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ email: 1 })
    .toArray();

  return NextResponse.json({ users: users.map((user) => ({
    ...user,
    _id: String(user._id),
  })) });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');
  const role = String(body?.role ?? 'pending').trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return new NextResponse(JSON.stringify({ message: 'Please provide a valid email address.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (password.length < 8) {
    return new NextResponse(JSON.stringify({ message: 'Password must be at least 8 characters long.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!VALID_ROLES.has(role)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid role. Allowed roles: admin, pending.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await admin.db.collection('users').findOne({ email });
  if (existing) {
    return new NextResponse(JSON.stringify({ message: 'This email is already registered.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await admin.db.collection('users').insertOne({
    email,
    passwordHash,
    role,
    createdAt: now,
    updatedAt: now,
  });

  const created = await admin.db.collection('users').findOne(
    { _id: result.insertedId },
    { projection: { passwordHash: 0 } },
  );

  return new NextResponse(JSON.stringify({
    ok: true,
    user: created
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
