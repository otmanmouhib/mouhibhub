const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return process.env;
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = line.split('=');
    env[key] = rest.join('=');
  });
  return env;
}

function inspectValue(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  if (Buffer.isBuffer(value)) return 'buffer';
  return typeof value;
}

function summarizeDoc(doc, summary = {}, prefix = '') {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return summary;
  for (const [key, value] of Object.entries(doc)) {
    const field = prefix ? `${prefix}.${key}` : key;
    const type = inspectValue(value);
    summary[field] = summary[field] || new Set();
    summary[field].add(type);
    if (type === 'object') summarizeDoc(value, summary, field);
    if (type === 'array' && value.length > 0 && typeof value[0] === 'object' && !Array.isArray(value[0])) {
      summarizeDoc(value[0], summary, `${field}[]`);
    }
  }
  return summary;
}

function prettySummary(summary) {
  return Object.entries(summary)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([field, types]) => `  - ${field}: ${[...types].sort().join(', ')}`)
    .join('\n');
}

function sanitizeDoc(doc, collectionName) {
  if (collectionName === 'images') {
    const safe = {
      _id: doc._id,
      contentType: doc.contentType,
      createdAt: doc.createdAt,
    };
    if (doc.size != null) safe.size = doc.size;
    return safe;
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'data') continue;
    if (Buffer.isBuffer(value)) sanitized[key] = `<Buffer ${value.length} bytes>`;
    else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'number') sanitized[key] = `[${value.length} numbers]`;
    else sanitized[key] = value;
  }
  return sanitized;
}

async function main() {
  const env = loadEnv();
  const uri = env.MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('atlanticdunes');
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const hiddenCollections = new Set(['images.files', 'images.chunks']);
    const names = collections
      .map((c) => c.name)
      .filter((name) => !name.startsWith('system.') && !hiddenCollections.has(name));

    console.log(`atlanticdunes collections (${names.length}): ${names.join(', ')}`);
    console.log('---');

    for (const name of names) {
      const coll = db.collection(name);
      const count = await coll.countDocuments();
      const docs = await coll.find({}, { sort: { _id: 1 } }).limit(3).toArray();
      const summary = docs.reduce((acc, doc) => summarizeDoc(doc, acc), {});
      const rels = Object.keys(summary)
        .filter((field) => /(Id|id)$/.test(field) && field !== 'id')
        .sort();

      console.log(`Collection: ${name}`);
      console.log(`Count: ${count}`);
      console.log(`Likely relation fields: ${rels.length ? rels.join(', ') : 'none'}`);
      console.log('Field summary:');
      console.log(prettySummary(summary));
      console.log('Sample docs:');
      docs.forEach((doc, index) => {
        console.log(`  [${index + 1}] ${JSON.stringify(sanitizeDoc(doc, name), null, 2).replace(/^/gm, '    ')}`);
      });
      console.log('---');
    }
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
