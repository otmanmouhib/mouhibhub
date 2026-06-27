import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = new Set(['admin', 'pending']);

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload?.email) {
    return {
      ok: false as const,
      response: new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const db = await getDb('mouhibhub');
  const currentUser = await db.collection('users').findOne({ email: payload.email });

  if (!currentUser || currentUser.role !== 'admin') {
    return {
      ok: false as const,
      response: new NextResponse(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return {
    ok: true as const,
    db,
    currentUser,
  };
}

function parseId(id: string) {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  return new ObjectId(id);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await context.params;
  const objectId = parseId(id);

  if (!objectId) {
    return new NextResponse(JSON.stringify({ message: 'Invalid user id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => null);
  const nextEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const nextPassword = typeof body?.password === 'string' ? body.password : '';
  const nextRole = typeof body?.role === 'string' ? body.role.trim().toLowerCase() : '';

  if (!nextEmail && !nextPassword && !nextRole) {
    return new NextResponse(JSON.stringify({ message: 'Provide at least one field to update.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await admin.db.collection('users').findOne({ _id: objectId });
  if (!existing) {
    return new NextResponse(JSON.stringify({ message: 'User not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
    return new NextResponse(JSON.stringify({ message: 'Please provide a valid email address.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (nextPassword && nextPassword.length < 8) {
    return new NextResponse(JSON.stringify({ message: 'Password must be at least 8 characters long.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (nextRole && !VALID_ROLES.has(nextRole)) {
    return new NextResponse(JSON.stringify({ message: 'Invalid role. Allowed roles: admin, pending.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (nextEmail && nextEmail !== String(existing.email ?? '').toLowerCase()) {
    const duplicate = await admin.db.collection('users').findOne({ email: nextEmail });
    if (duplicate) {
      return new NextResponse(JSON.stringify({ message: 'This email is already in use.' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (nextRole && existing.role === 'admin' && nextRole !== 'admin') {
    const adminCount = await admin.db.collection('users').countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return new NextResponse(JSON.stringify({ message: 'Cannot demote the last admin account.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (String(existing.email ?? '').toLowerCase() === String(admin.currentUser.email ?? '').toLowerCase()) {
      return new NextResponse(JSON.stringify({ message: 'You cannot change your own admin role here.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (nextEmail) {
    updates.email = nextEmail;
  }

  if (nextRole) {
    updates.role = nextRole;
  }

  if (nextPassword) {
    updates.passwordHash = await bcrypt.hash(nextPassword, 10);
  }

  await admin.db.collection('users').updateOne({ _id: objectId }, { $set: updates });

  const updated = await admin.db.collection('users').findOne(
    { _id: objectId },
    { projection: { passwordHash: 0 } },
  );

  return new NextResponse(JSON.stringify({
    ok: true,
    user: updated
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
  const admin = await requireAdmin(request);
  if (!admin.ok) {
    return admin.response;
  }

  const { id } = await context.params;
  const objectId = parseId(id);

  if (!objectId) {
    return new NextResponse(JSON.stringify({ message: 'Invalid user id.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existing = await admin.db.collection('users').findOne({ _id: objectId });
  if (!existing) {
    return new NextResponse(JSON.stringify({ message: 'User not found.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const existingEmail = String(existing.email ?? '').toLowerCase();
  const currentEmail = String(admin.currentUser.email ?? '').toLowerCase();

  if (existingEmail === currentEmail) {
    return new NextResponse(JSON.stringify({ message: 'You cannot delete your own account from this page.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (existing.role === 'admin') {
    const adminCount = await admin.db.collection('users').countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return new NextResponse(JSON.stringify({ message: 'Cannot delete the last admin account.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  await admin.db.collection('users').deleteOne({ _id: objectId });

  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
