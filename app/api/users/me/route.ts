import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, verifyAuthToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

const COOKIE_NAME = 'mouhibhub-auth';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createCookie(value: string) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=3600`;
}

function clearCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function jsonResponse(payload: unknown, status = 200, cookie?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookie) {
    headers['Set-Cookie'] = cookie;
  }

  return new NextResponse(JSON.stringify(payload), {
    status,
    headers,
  });
}

async function getCurrentUser(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value ?? null;
  const payload = token ? verifyAuthToken(token) : null;

  if (!payload?.email) {
    return null;
  }

  const db = await getDb('mouhibhub');
  const user = await db.collection('users').findOne({ email: payload.email });

  if (!user) {
    return null;
  }

  return { db, tokenEmail: payload.email, user };
}

export async function GET(request: NextRequest) {
  const current = await getCurrentUser(request);

  if (!current) {
    return jsonResponse({ message: 'Unauthorized' }, 401);
  }

  const { user } = current;

  return jsonResponse({
    user: {
      _id: String(user._id),
      email: String(user.email ?? ''),
      role: String(user.role ?? ''),
      createdAt: user.createdAt ?? null,
      updatedAt: user.updatedAt ?? null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const current = await getCurrentUser(request);

  if (!current) {
    return jsonResponse({ message: 'Unauthorized' }, 401);
  }

  const body = await request.json().catch(() => null);
  const nextEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const nextPassword = typeof body?.password === 'string' ? body.password : '';

  if (!nextEmail && !nextPassword) {
    return jsonResponse({ message: 'Provide email and/or password to update.' }, 400);
  }

  if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
    return jsonResponse({ message: 'Please provide a valid email address.' }, 400);
  }

  if (nextPassword && nextPassword.length < 8) {
    return jsonResponse({ message: 'Password must be at least 8 characters long.' }, 400);
  }

  const { db, user, tokenEmail } = current;

  if (nextEmail && nextEmail !== tokenEmail) {
    const duplicate = await db.collection('users').findOne({ email: nextEmail });
    if (duplicate) {
      return jsonResponse({ message: 'This email is already in use.' }, 409);
    }
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (nextEmail) {
    updates.email = nextEmail;
  }

  if (nextPassword) {
    updates.passwordHash = await bcrypt.hash(nextPassword, 10);
  }

  await db.collection('users').updateOne({ _id: user._id }, { $set: updates });

  const refreshedUser = await db.collection('users').findOne({ _id: user._id });
  if (!refreshedUser) {
    return jsonResponse({ message: 'Unable to load updated profile.' }, 500);
  }

  const responseCookie = nextEmail && nextEmail !== tokenEmail ? createCookie(createAuthToken({ email: nextEmail })) : undefined;

  return jsonResponse(
    {
      ok: true,
      user: {
        _id: String(refreshedUser._id),
        email: String(refreshedUser.email ?? ''),
        role: String(refreshedUser.role ?? ''),
        createdAt: refreshedUser.createdAt ?? null,
        updatedAt: refreshedUser.updatedAt ?? null,
      },
    },
    200,
    responseCookie,
  );
}

export async function DELETE(request: NextRequest) {
  const current = await getCurrentUser(request);

  if (!current) {
    return jsonResponse({ message: 'Unauthorized' }, 401);
  }

  const { db, user } = current;

  if (user.role === 'admin') {
    const adminCount = await db.collection('users').countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      return jsonResponse({ message: 'Cannot delete the last admin account.' }, 400);
    }
  }

  await db.collection('users').deleteOne({ _id: user._id });

  return jsonResponse({ ok: true }, 200, clearCookie());
}
