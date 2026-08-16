// One-time production bootstrap: creates a single ADMIN user, nothing else. Unlike
// prisma/seed.ts (dev/demo data — 8 fake professionals, wipes existing users), this is safe to
// run against a real database because it only ever adds one row and never deletes anything.
//
// Usage: ADMIN_EMAIL=you@example.com ADMIN_NAME="Seu Nome" ADMIN_PASSWORD="senha-forte" npx tsx scripts/create-admin.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  const name = process.env.ADMIN_NAME?.trim()
  const password = process.env.ADMIN_PASSWORD

  if (!email || !name || !password) {
    console.error('Set ADMIN_EMAIL, ADMIN_NAME and ADMIN_PASSWORD env vars before running this script.')
    process.exit(1)
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters.')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error(`A user with email ${email} already exists (role: ${existing.role}). Nothing created.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  await prisma.user.create({
    data: { name, email, passwordHash, role: 'ADMIN' },
  })

  console.log(`Admin created: ${email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
