import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

type AuthSettings = {
  _id: 'auth';
  registerEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
};

function jsonResponse(payload: unknown, status = 200) {
  return new NextResponse(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET() {
  const db = await getDb('mouhibhub');
  const settings = await db.collection<AuthSettings>('settings').findOne({ _id: 'auth' });

  return jsonResponse({
    registerEnabled: Boolean(settings?.registerEnabled),
  });
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload?.email) {
    return jsonResponse({ message: 'Unauthorized' }, 401);
  }

  const body = await request.json().catch(() => null);
  const registerEnabled = Boolean(body?.registerEnabled);

  const db = await getDb('mouhibhub');
  const currentUser = await db.collection('users').findOne({ email: payload.email });

  if (!currentUser || currentUser.role !== 'admin') {
    return jsonResponse({ message: 'Forbidden' }, 403);
  }

  await db.collection<AuthSettings>('settings').updateOne(
    { _id: 'auth' },
    {
      $set: {
        registerEnabled,
        updatedAt: new Date().toISOString(),
        updatedBy: payload.email,
      },
      $setOnInsert: {
        createdAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );

  return jsonResponse({ ok: true, registerEnabled });
}
