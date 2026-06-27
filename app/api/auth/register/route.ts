import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getUserByEmail } from '../../../../lib/mongodb';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type AuthSettings = {
  _id: 'auth';
  registerEnabled?: boolean;
};

function badRequest(message: string) {
  return new NextResponse(JSON.stringify({ message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? '').trim().toLowerCase();
  const password = String(body?.password ?? '');

  if (!EMAIL_REGEX.test(email)) {
    return badRequest('Please provide a valid email address.');
  }

  if (password.length < 8) {
    return badRequest('Password must be at least 8 characters long.');
  }

  const db = await getDb('mouhibhub');
  const settings = await db.collection<AuthSettings>('settings').findOne({ _id: 'auth' });

  if (!settings?.registerEnabled) {
    return new NextResponse(JSON.stringify({ message: 'Registration is currently disabled.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existingUser = await getUserByEmail(email);
  if (existingUser) {
    return new NextResponse(JSON.stringify({ message: 'This email is already registered.' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  await db.collection('users').insertOne({
    email,
    passwordHash,
    role: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  return new NextResponse(JSON.stringify({ ok: true, message: 'Registration submitted. Your account is pending approval.' }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
}
