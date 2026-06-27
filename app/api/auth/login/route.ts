import { NextRequest, NextResponse } from 'next/server';
import { createAuthToken, validateAdminCredentials } from '../../../../lib/auth';

const COOKIE_NAME = 'mouhibhub-auth';

function createCookie(value: string) {
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=3600`;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body?.email || '').trim().toLowerCase();
  const password = String(body?.password || '');

  const validation = await validateAdminCredentials(email, password);

  if (!validation.ok) {
    const message =
      validation.reason === 'pending'
        ? 'Your account is pending approval. Only admin accounts can log in.'
        : 'Invalid email or password';

    return new NextResponse(JSON.stringify({ message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = createAuthToken({ email });
  const response = new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': createCookie(token),
    },
  });

  return response;
}
