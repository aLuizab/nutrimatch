import { createHash, randomBytes } from 'crypto'
import { prisma } from './prisma'

const TOKEN_TTL_MINUTES = 30

/** Only the hash is persisted, so a database dump yields no usable reset tokens. */
export function hashToken(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

export async function createResetToken(userId: string) {
  const raw = randomBytes(32).toString('base64url')

  // Any outstanding token is invalidated first: requesting a new link must kill the old one,
  // otherwise every past email stays live until its own expiry.
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  })

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    },
  })

  return raw
}

/** Returns the userId when the token is valid, unused and unexpired; null otherwise. */
export async function consumeResetToken(raw: string): Promise<string | null> {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(raw) } })
  if (!record || record.usedAt || record.expiresAt < new Date()) return null

  // Single use: marking it consumed here, guarded on usedAt still being null, means two
  // concurrent submissions of the same link can't both succeed.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  })
  if (claimed.count === 0) return null

  return record.userId
}
