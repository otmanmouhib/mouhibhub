import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../../lib/auth';
import { getCollectionCount, getAvailableCollections } from '../../../../../lib/mongodb';

const websites = [
  {
    db: 'atlanticdunes',
    label: 'Atlantic Dunes',
    url: 'atlanticdunes.com',
    status: 'Live',
  },
  {
    db: 'adrobiofarm',
    label: 'Adro Bio Farm',
    url: 'adrobiofarm.com',
    status: 'Live',
  },
  {
    db: 'mouhibhub',
    label: 'MBHUB',
    url: 'mouhibhub.com',
    status: 'Live',
  },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ site: string }> }) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const resolvedParams = await params;
  const site = websites.find((entry) => entry.db === resolvedParams.site);

  if (!site) {
    return new NextResponse(JSON.stringify({ message: 'Website not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const availableCollections = await getAvailableCollections(site.db, [
    'contacts',
    'reports',
    'users',
  ]);

  const contactCount = availableCollections.includes('contacts')
    ? await getCollectionCount(site.db, 'contacts')
    : 0;
  const reportCount = availableCollections.includes('reports')
    ? await getCollectionCount(site.db, 'reports')
    : 0;

  return NextResponse.json({
    site: {
      ...site,
      contacts: contactCount,
      reports: reportCount,
      availableCollections,
      lastSeen: 'today',
    },
  });
}
