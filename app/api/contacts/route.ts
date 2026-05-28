import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../lib/auth';
import { getContactsFromDb } from '../../../lib/mongodb';

const sources = [
  { db: 'atlanticdunes' },
  { db: 'adrobiofarm' },
  { db: 'mouhibhub' },
];

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
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
