import { MongoClient } from 'mongodb';

declare global {
  // eslint-disable-next-line no-var
  var mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const uri = process.env.MONGODB_URI;
const options = {};

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  if (!global.mongoClientPromise) {
    global.mongoClientPromise = new MongoClient(uri, options).connect();
  }
  clientPromise = global.mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri, options).connect();
}

export async function getClient() {
  return clientPromise;
}

export async function getDb(dbName: string) {
  const client = await getClient();
  return client.db(dbName);
}

export async function getUserByEmail(email: string) {
  const db = await getDb('mouhibhub');
  return db.collection('users').findOne({ email });
}

export async function getContactsFromDb(dbName: string) {
  const client = await getClient();
  const db = client.db(dbName);
  const contacts = await db.collection('contacts').find().sort({ _id: -1 }).limit(50).toArray();

  return contacts.map((record) => ({
    ...record,
    _id: String(record._id),
  }));
}

export async function getAvailableCollections(dbName: string, collections: string[]) {
  const db = await getDb(dbName);
  const available: string[] = [];

  await Promise.all(
    collections.map(async (collectionName) => {
      const exists = await db
        .listCollections({ name: collectionName }, { nameOnly: true })
        .hasNext();
      if (exists) {
        available.push(collectionName);
      }
    }),
  );

  return available;
}

export async function getCollectionCount(dbName: string, collectionName: string) {
  const db = await getDb(dbName);
  return db.collection(collectionName).countDocuments();
}

export async function getReportsFromDb(dbName: string) {
  const client = await getClient();
  const db = client.db(dbName);
  const reports = await db.collection('reports').find().sort({ _id: -1 }).limit(10).toArray();

  if (reports.length > 0) {
    return reports.map((report) => ({
      ...report,
      _id: String(report._id),
    }));
  }

  return [];
}
