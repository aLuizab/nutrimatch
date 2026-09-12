import bcrypt from 'bcryptjs'

// 12 rounds: the 2026 baseline for credentials guarding health data. Costs ~250ms per hash,
// which is the point — it is what makes offline cracking of a stolen dump expensive.
const BCRYPT_COST = 12

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

// A real bcrypt hash of a value nobody can log in with. Compared against when the email
// doesn't exist so the response takes the same ~250ms either way — otherwise a short-circuit
// return leaks "this email is not registered" through response timing alone.
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.Q0dCgAG9cCzOWkmDJHYWLXqUmUUUuTS'

export async function fakeVerifyPassword(password: string) {
  await bcrypt.compare(password, DUMMY_HASH)
}
