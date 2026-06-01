import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '../../../../lib/auth';
import { getCollectionCount, getAvailableCollections } from '../../../../lib/mongodb';

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
    label: 'MBHUB CMS',
    url: 'mnhub.com',
    status: 'Live',
  },
];

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const websiteData = await Promise.all(
    websites.map(async (site) => {
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

      return {
        ...site,
        contacts: contactCount,
        reports: reportCount,
        availableCollections,
        lastSeen: 'today',
      };
    }),
  );

  return NextResponse.json({
    websites: websiteData,
  });
}
