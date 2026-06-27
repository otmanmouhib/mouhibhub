import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getUserByEmail } from './mongodb';

const SECRET = process.env.AUTH_SECRET ?? (process.env.NODE_ENV !== 'production' ? 'dev-secret-mouhibhub' : undefined);

if (!SECRET) {
  throw new Error('Missing AUTH_SECRET environment variable.');
}

export type AuthTokenPayload = {
  email: string;
  iat?: number;
  exp?: number;
};

export type AdminCredentialsValidationResult = {
  ok: boolean;
  reason?: 'missing' | 'invalid' | 'pending' | 'forbidden';
};

export function createAuthToken(payload: { email: string }) {
  return jwt.sign(payload, SECRET as string, { expiresIn: '1h' });
}

export function verifyAuthToken(token: string) {
  try {
    const payload = jwt.verify(token, SECRET as string);
    if (typeof payload === 'object' && typeof payload.email === 'string') {
      return payload as AuthTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function validateAdminCredentials(email: string, password: string) {
  if (!email || !password) {
    return { ok: false, reason: 'missing' } satisfies AdminCredentialsValidationResult;
  }

  const user = await getUserByEmail(email);
  if (!user || typeof user.passwordHash !== 'string') {
    return { ok: false, reason: 'invalid' } satisfies AdminCredentialsValidationResult;
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    return { ok: false, reason: 'invalid' } satisfies AdminCredentialsValidationResult;
  }

  if (user.role === 'pending') {
    return { ok: false, reason: 'pending' } satisfies AdminCredentialsValidationResult;
  }

  if (user.role !== 'admin') {
    return { ok: false, reason: 'forbidden' } satisfies AdminCredentialsValidationResult;
  }

  return { ok: true } satisfies AdminCredentialsValidationResult;
}
