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
    'services',
    'products',
    'boutique',
    'boutiqueProducts',
    'poles',
    'domains',
    'news',
    'newsCategories',
    'images',
  ]);

  const boutiqueCollectionName = availableCollections.includes('boutique')
    ? 'boutique'
    : availableCollections.includes('boutiqueProducts')
      ? 'boutiqueProducts'
      : undefined;

  const contactCount = availableCollections.includes('contacts')
    ? await getCollectionCount(site.db, 'contacts')
    : 0;
  const reportCount = availableCollections.includes('reports')
    ? await getCollectionCount(site.db, 'reports')
    : 0;
  const servicesCount = availableCollections.includes('services')
    ? await getCollectionCount(site.db, 'services')
    : 0;
  const productsCount = availableCollections.includes('products')
    ? await getCollectionCount(site.db, 'products')
    : 0;
  const boutiqueCount = boutiqueCollectionName
    ? await getCollectionCount(site.db, boutiqueCollectionName)
    : 0;

  const normalizedAvailableCollections = boutiqueCollectionName === 'boutiqueProducts'
    ? [...availableCollections.filter((name) => name !== 'boutiqueProducts'), 'boutique']
    : availableCollections;

  const polesCount = availableCollections.includes('poles')
    ? await getCollectionCount(site.db, 'poles')
    : 0;
  const domainsCount = availableCollections.includes('domains')
    ? await getCollectionCount(site.db, 'domains')
    : 0;
  const newsCount = availableCollections.includes('news')
    ? await getCollectionCount(site.db, 'news')
    : 0;
  const newsCategoriesCount = availableCollections.includes('newsCategories')
    ? await getCollectionCount(site.db, 'newsCategories')
    : 0;
  const imagesCount = availableCollections.includes('images')
    ? await getCollectionCount(site.db, 'images')
    : 0;

  return NextResponse.json({
    site: {
      ...site,
      contacts: contactCount,
      reports: reportCount,
      services: servicesCount,
      products: productsCount,
      boutique: boutiqueCount,
      poles: polesCount,
      domains: domainsCount,
      news: newsCount,
      newsCategories: newsCategoriesCount,
      images: imagesCount,
      availableCollections: normalizedAvailableCollections,
      lastSeen: 'today',
    },
  });
}
