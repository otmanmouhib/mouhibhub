const fs = require('fs');
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

function loadEnv() {
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    return process.env;
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...rest] = trimmed.split('=');
    env[key] = rest.join('=');
  });
  return env;
}

async function main() {
  const env = loadEnv();
  const uri = env.MONGODB_URI || process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI is required in .env.local or environment variables.');
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const databases = ['mouhibhub', 'atlanticdunes', 'adrobiofarm'];
    const sample = [
      {
        name: 'Test User',
        email: 'test@example.com',
        message: 'This is a sample contact submission created for development.',
        createdAt: new Date().toISOString(),
      },
      {
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        message: 'Please contact me with more information about your services.',
        createdAt: new Date().toISOString(),
      },
    ];

    for (const dbName of databases) {
      const db = client.db(dbName);
      const collection = db.collection('contacts');
      const result = await collection.insertMany(sample);
      console.log(`Inserted ${result.insertedCount} documents into ${dbName}.contacts`);
    }

    const passwordHash = bcrypt.hashSync('ChangeMe123!', 10);
    const adminDb = client.db('mouhibhub');
    const users = adminDb.collection('users');
    await users.updateOne(
      { email: 'admin@mouhibhub.com' },
      {
        $set: {
          email: 'admin@mouhibhub.com',
          passwordHash,
          role: 'admin',
          updatedAt: new Date().toISOString(),
        },
        $setOnInsert: {
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true },
    );
    console.log('Seeded admin user into mouhibhub.users: admin@mouhibhub.com / ChangeMe123!');

    console.log('\n✅ Seeding complete. You can now log in with the seeded admin user.');
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
