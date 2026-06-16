const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = envContent.split(/\r?\n/).reduce((acc, line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return acc;
  const [key, ...rest] = line.split('=');
  acc[key] = rest.join('=');
  return acc;
}, {});
const uri = env.MONGODB_URI || process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI missing');
  process.exit(1);
}
(async () => {
  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  try {
    await client.connect();
    const db = client.db('atlanticdunes');
    const collections = await db.listCollections().toArray();
    console.log('collections:', collections.map((c) => c.name).sort().join(', '));
    const names = ['boutique', 'boutiqueProducts', 'boutiqueCategories', 'news', 'newsCategories', 'products', 'services', 'domains', 'poles'];
    for (const name of names) {
      const exists = collections.some((c) => c.name === name);
      if (!exists) continue;
      const col = db.collection(name);
      const count = await col.countDocuments();
      console.log(`\nCOLLECTION ${name} count=${count}`);
      const docs = await col.find({}).limit(10).toArray();
      console.log(JSON.stringify(docs, null, 2));
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
})();
