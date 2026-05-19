import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getContactsFromDb } from '../../../lib/mongodb';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sources = [
    { db: 'atlanticdunes' },
    { db: 'adrobiofarm' },
    { db: 'mouhibhub' },
  ];

  const results = await Promise.all(
    sources.map(async (source) => ({
      db: source.db,
      contacts: await getContactsFromDb(source.db),
    })),
  );

  return NextResponse.json({ sources: results });
}
