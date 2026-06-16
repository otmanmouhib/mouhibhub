import { getDb } from './mongodb';
import type { Document, WithId } from 'mongodb';

export type AtlanticDunesCollectionName =
  | 'poles'
  | 'domains'
  | 'newsCategories'
  | 'boutiqueCategories'
  | 'services'
  | 'products'
  | 'boutique'
  | 'news'
  | 'entrepriseInfo';

export type AtlanticDunesRecord = Record<string, any> & { _id: string };

export const atlanticDunesCollections: AtlanticDunesCollectionName[] = [
  'poles',
  'domains',
  'newsCategories',
  'boutiqueCategories',
  'services',
  'products',
  'boutique',
  'news',
  'entrepriseInfo',
];

export const collectionMetadata: Record<AtlanticDunesCollectionName, { label: string; description: string; idField: 'slug' | 'id' | '_id' }> = {
  poles: {
    label: 'Poles',
    description: 'Core business poles for website navigation and service mapping.',
    idField: 'slug',
  },
  domains: {
    label: 'Domains',
    description: 'Primary domains used to categorize services and products.',
    idField: 'slug',
  },
  newsCategories: {
    label: 'News categories',
    description: 'Category records for news articles.',
    idField: 'id',
  },
  boutiqueCategories: {
    label: 'Boutique categories',
    description: 'Category records for boutique items and nested subcategories.',
    idField: 'slug',
  },
  services: {
    label: 'Services',
    description: 'Service pages with methodology, deliverables, and taxonomy fields.',
    idField: 'slug',
  },
  products: {
    label: 'Products',
    description: 'Products with specs, pricing, and optional image references.',
    idField: 'slug',
  },
  boutique: {
    label: 'Boutique items',
    description: 'Boutique products with pricing, availability, and gallery images.',
    idField: 'slug',
  },
  news: {
    label: 'News articles',
    description: 'News articles with categories, status, and rich content arrays.',
    idField: 'slug',
  },
  entrepriseInfo: {
    label: 'Enterprise info',
    description: 'The main enterprise contact information document.',
    idField: '_id',
  },
};

export function isAtlanticDunesCollection(value: string): value is AtlanticDunesCollectionName {
  return atlanticDunesCollections.includes(value as AtlanticDunesCollectionName);
}

export function getCollectionIdField(collection: AtlanticDunesCollectionName) {
  return collectionMetadata[collection].idField;
}

export function resolveDocumentId(collection: AtlanticDunesCollectionName, payload: Partial<AtlanticDunesRecord>) {
  if (collection === 'entrepriseInfo') {
    return 'main';
  }

  if (payload._id && typeof payload._id === 'string' && payload._id.trim() !== '') {
    return payload._id.trim();
  }

  const idField = getCollectionIdField(collection);
  if (payload[idField] && typeof payload[idField] === 'string' && payload[idField].trim() !== '') {
    return payload[idField].trim();
  }

  return undefined;
}

export async function getAtlanticDunesDb() {
  return getDb('atlanticdunes');
}

export async function countAtlanticDunesDocuments(collection: AtlanticDunesCollectionName) {
  const db = await getAtlanticDunesDb();
  return db.collection<AtlanticDunesRecord>(collection).countDocuments();
}

export async function listAtlanticDunesDocuments(collection: AtlanticDunesCollectionName) {
  const db = await getAtlanticDunesDb();
  const documents = await db
    .collection<AtlanticDunesRecord>(collection)
    .find({}, { sort: { _id: 1 } })
    .limit(200)
    .toArray();

  return documents.map((document) => ({
    ...document,
    _id: String(document._id),
  }));
}

export async function getAtlanticDunesDocument(collection: AtlanticDunesCollectionName, id: string) {
  const db = await getAtlanticDunesDb();
  const document = await db.collection<AtlanticDunesRecord>(collection).findOne({ _id: id });
  return document ? ({ ...document, _id: String(document._id) } as AtlanticDunesRecord) : null;
}

export async function createAtlanticDunesDocument(collection: AtlanticDunesCollectionName, payload: AtlanticDunesRecord) {
  const db = await getAtlanticDunesDb();
  const existing = await db.collection<AtlanticDunesRecord>(collection).findOne({ _id: payload._id });
  if (existing) {
    throw new Error('A document with that identifier already exists.');
  }

  await db.collection<AtlanticDunesRecord>(collection).insertOne(payload);
  return payload;
}

export async function updateAtlanticDunesDocument(collection: AtlanticDunesCollectionName, id: string, payload: AtlanticDunesRecord) {
  const db = await getAtlanticDunesDb();
  const result = await db.collection<AtlanticDunesRecord>(collection).replaceOne({ _id: id }, payload, { upsert: false });
  if (result.matchedCount === 0) {
    throw new Error('Document not found');
  }
  return payload;
}

export async function deleteAtlanticDunesDocument(collection: AtlanticDunesCollectionName, id: string) {
  const db = await getAtlanticDunesDb();
  const result = await db.collection<AtlanticDunesRecord>(collection).deleteOne({ _id: id });
  return result.deletedCount > 0;
}

export function getDocumentationHint(collection: AtlanticDunesCollectionName) {
  return {
    poles: 'Requires slug, label, shortDescription.',
    domains: 'Requires slug, label, description.',
    newsCategories: 'Requires id, label, description.',
    services: 'Requires slug, title, shortDescription, description, methodology, deliverable, poleId, domainId.',
    products: 'Requires slug, title, shortDescription, description, specs, performance, poleId, domainId, pdfLink.',
    boutique: 'Requires slug, title, shortDescription, description, details, specs, price, availability, inStock, poleId, domainId.',
    boutiqueCategories: 'Requires slug, label, description, and optional nested subcategories.',
    news: 'Requires slug, title, date, publishedAt, categoryId, summary, content.',
    entrepriseInfo: 'Single document with email, phones, addressLines, optional fax.',
  }[collection];
}
