import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../lib/mongodb';
import { verifyAuthToken } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('mouhibhub-auth')?.value ?? null;

  if (!token || !verifyAuthToken(token)) {
    return new NextResponse(JSON.stringify({ message: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = await getDb('mouhibhub');
  const users = await db
    .collection('users')
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ email: 1 })
    .toArray();

  return NextResponse.json({ users: users.map((user) => ({
    ...user,
    _id: String(user._id),
  })) });
}
