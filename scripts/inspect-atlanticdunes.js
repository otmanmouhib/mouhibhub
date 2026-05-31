const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    return process.env;
  }

  const file = fs.readFileSync(envPath, 'utf8');
  const env = {};
  file.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...valueParts] = trimmed.split('=');
    env[key] = valueParts.join('=');
  });
  return env;
}

function summarizeFieldTypes(doc, summary = {}, prefix = '') {
  if (doc && typeof doc === 'object' && !Array.isArray(doc)) {
    for (const [key, value] of Object.entries(doc)) {
      const fieldName = prefix ? `${prefix}.${key}` : key;
      const type = Array.isArray(value)
        ? 'array'
        : value === null
        ? 'null'
        : value instanceof Date
        ? 'date'
        : typeof value;

      summary[fieldName] = summary[fieldName] || new Set();
      summary[fieldName].add(type);

      if (type === 'object') {
        summarizeFieldTypes(value, summary, fieldName);
      }

      if (type === 'array') {
        const arrayType = summary[`${fieldName}[]`] || new Set();
        for (const item of value) {
          const itemType = Array.isArray(item)
            ? 'array'
            : item === null
            ? 'null'
            : item instanceof Date
            ? 'date'
            : typeof item;
          arrayType.add(itemType);
          if (itemType === 'object') {
            summarizeFieldTypes(item, summary, `${fieldName}[]`);
          }
        }
        summary[`${fieldName}[]`] = arrayType;
      }
    }
  }
  return summary;
}

function formatSummary(summary) {
  const entries = Object.entries(summary)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([field, types]) => ({ field, types: Array.from(types).sort().join(', ') }));

  return entries.map(({ field, types }) => `  - ${field}: ${types}`).join('\n');
}

function findRelationFields(summary) {
  return Object.keys(summary)
    .filter((field) => /Id$|Ids$|_id$|Id\[\]$/.test(field))
    .sort();
}

async function main() {
  const env = loadEnv();
  const uri = env.MONGODB_URI || process.env.MONGODB_URI;

  if (!uri) {
    console.error('Missing MONGODB_URI in .env.local or environment variables.');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('atlanticdunes');

    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    const hiddenCollections = new Set(['images.files', 'images.chunks']);
    const names = collections
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith('system.') && !hiddenCollections.has(name));

    if (names.length === 0) {
      console.log('No collections found in atlanticdunes database.');
      return;
    }

    console.log(`atlanticdunes database collections (${names.length}):`);
    for (const name of names) {
      const collection = db.collection(name);
      const count = await collection.countDocuments();
      const docs = await collection.find({}, { sort: { _id: 1 } }).limit(5).toArray();

      const summary = docs.reduce((acc, doc) => summarizeFieldTypes(doc, acc), {});
      const relations = findRelationFields(summary);

      console.log('\n'.repeat(2));
      console.log(`Collection: ${name}`);
      console.log(`  Count: ${count}`);
      console.log(`  Sample docs: ${docs.length}`);
      if (relations.length > 0) {
        console.log('  Likely relational fields:');
        relations.forEach((field) => console.log(`    - ${field}`));
      }
      console.log('  Detected fields:');
      console.log(formatSummary(summary));
      console.log('\n  Sample documents:');
      docs.forEach((doc, index) => {
        const sample = { ...doc };
        if (sample._id && typeof sample._id !== 'string') {
          sample._id = String(sample._id);
        }
        console.log(`\n  [${index + 1}] ${JSON.stringify(sample, null, 2).replace(/^/gm, '    ')}`);
      });
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Failed to inspect atlanticdunes database:', error);
  process.exit(1);
});
