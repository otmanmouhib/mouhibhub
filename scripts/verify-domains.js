const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return process.env;
  const content = fs.readFileSync(envPath, 'utf8');
  return content.split(/\r?\n/).reduce((acc, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return acc;
    const [key, ...rest] = line.split('=');
    acc[key] = rest.join('=');
    return acc;
  }, {});
}

(async function () {
  const env = loadEnv();
  const uri = env.MONGODB_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI missing');
    process.exit(1);
  }
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('atlanticdunes');
    const collections = ['contacts','reports','users','services','products','boutique','boutiqueProducts','poles','domains','news','newsCategories','images'];
    const available = [];
    for (const name of collections) {
      const exists = await db.listCollections({ name }, { nameOnly: true }).hasNext();
      console.log(name, 'exists?', exists);
      if (exists) available.push(name);
    }
    console.log('available', available);
    if (available.includes('domains')) {
      console.log('domains count', await db.collection('domains').countDocuments());
    }
  } finally {
    await client.close();
  }
})();
