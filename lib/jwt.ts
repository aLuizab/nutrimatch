import { SignJWT } from 'jose/jwt/sign'
import { jwtVerify } from 'jose/jwt/verify'
import type { JWTPayload } from 'jose'
import { getEnv } from './env'

export const SESSION_COOKIE = 'nutrimatch_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 days

export type Role = 'PATIENT' | 'PROFESSIONAL' | 'ADMIN'

export interface SessionPayload extends JWTPayload {
  userId: string
  role: Role
}

function getSecret() {
  // getEnv() rejects short/placeholder secrets rather than signing forgeable tokens with them.
  // Kept out of the edge-incompatible path: this only reads process.env + zod, no Node APIs.
  return new TextEncoder().encode(getEnv().JWT_SECRET)
}

export async function signSessionToken(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    // Pinning algorithms rejects a token whose header advertises a different alg, rather than
    // relying on the key type alone to rule it out.
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] })
    if (typeof payload.userId !== 'string' || typeof payload.role !== 'string') return null
    return payload as SessionPayload
  } catch {
    return null
  }
}
