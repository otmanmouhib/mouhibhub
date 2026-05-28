import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getDb } from '../../../../lib/mongodb';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sources = ['atlanticdunes', 'adrobiofarm', 'mouhibhub'];

  const counts = await Promise.all(
    sources.map(async (dbName) => {
      const db = await getDb(dbName);
      return db.collection('contacts').countDocuments();
    }),
  );

  const totalContacts = counts.reduce((sum, count) => sum + count, 0);
  const mouhibhubDb = await getDb('mouhibhub');
  const usersCount = await mouhibhubDb.collection('users').countDocuments();

  return NextResponse.json({
    websitesMonitored: sources.length,
    databases: sources.length,
    contacts: totalContacts,
    users: usersCount,
    health: 'Healthy',
  });
}
