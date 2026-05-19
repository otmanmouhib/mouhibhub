import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from './mongodb';

const SECRET = process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== 'production' ? 'dev-secret-mouhibhub' : undefined);

if (!SECRET) {
  throw new Error('Missing AUTH_SECRET environment variable.');
}

export function createAuthToken(payload: { email: string }) {
  return jwt.sign(payload, SECRET as string, { expiresIn: '1h' });
}

export function verifyAuthToken(token: string) {
  try {
    return jwt.verify(token, SECRET as string);
  } catch {
    return null;
  }
}

export async function validateAdminCredentials(email: string, password: string) {
  if (!email || !password) {
    return false;
  }

  const user = await getUserByEmail(email);
  if (!user || typeof user.passwordHash !== 'string') {
    return false;
  }

  return bcrypt.compare(password, user.passwordHash);
}
