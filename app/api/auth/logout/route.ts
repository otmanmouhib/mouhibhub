import { NextResponse } from 'next/server';

const COOKIE_NAME = 'mouhibhub-auth';

export async function POST() {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  return new NextResponse(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
