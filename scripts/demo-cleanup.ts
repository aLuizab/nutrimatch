import { PrismaClient } from '@prisma/client'

/**
 * Lista — e, só com --apply, remove — as contas de demonstração criadas por prisma/seed.ts.
 *
 * Existe como script revisável em vez de um comando solto porque este banco é o de produção:
 * quem apaga precisa ver antes o que vai junto. As exclusões em cascata do schema levam
 * consultas, avaliações, pagamentos e repasses atrelados a cada conta, e nada disso volta.
 *
 *   npx tsx scripts/demo-cleanup.ts            # só lista
 *   npx tsx scripts/demo-cleanup.ts --apply    # remove
 */

const prisma = new PrismaClient()

// Endereços exatos, nunca um padrão como "%@nutrimatch.com.br": um dia alguém real se cadastra
// num domínio parecido e um curinga leva a conta dessa pessoa junto.
const DEMO_EMAILS = [
  'carolina@nutrimatch.com.br',
  'rafael@nutrimatch.com.br',
  'mariafernanda@nutrimatch.com.br',
  'juliana@nutrimatch.com.br',
  'andre@nutrimatch.com.br',
  'beatriz@nutrimatch.com.br',
  'lucas@nutrimatch.com.br',
  'amanda@nutrimatch.com.br',
  'ana@email.com',
  'carlos@email.com',
  'fernanda@email.com',
]

async function main() {
  const apply = process.argv.includes('--apply')

  const users = await prisma.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    include: {
      professional: { select: { id: true } },
      patient: { select: { id: true } },
    },
    orderBy: { role: 'asc' },
  })

  if (users.length === 0) {
    console.log('Nenhuma conta de demonstração encontrada. Nada a fazer.')
    return
  }

  console.log(`\n${users.length} conta(s) de demonstração encontradas:\n`)

  let totals = { appointments: 0, reviews: 0, enrollments: 0, progress: 0, goals: 0, payouts: 0 }

  for (const u of users) {
    const professionalId = u.professional?.id
    const patientId = u.patient?.id

    const [appointments, reviews, enrollments, progress, goals, payouts] = await Promise.all([
      prisma.appointment.count({
        where: professionalId ? { professionalId } : patientId ? { patientId } : { id: '' },
      }),
      prisma.review.count({
        where: professionalId ? { professionalId } : patientId ? { patientId } : { id: '' },
      }),
      prisma.enrollment.count({
        where: professionalId ? { professionalId } : patientId ? { patientId } : { id: '' },
      }),
      patientId ? prisma.progressEntry.count({ where: { patientId } }) : Promise.resolve(0),
      patientId ? prisma.goal.count({ where: { patientId } }) : Promise.resolve(0),
      professionalId ? prisma.payout.count({ where: { professionalId } }) : Promise.resolve(0),
    ])

    totals = {
      appointments: totals.appointments + appointments,
      reviews: totals.reviews + reviews,
      enrollments: totals.enrollments + enrollments,
      progress: totals.progress + progress,
      goals: totals.goals + goals,
      payouts: totals.payouts + payouts,
    }

    const partes = [
      appointments && `${appointments} consulta(s)`,
      reviews && `${reviews} avaliação(ões)`,
      enrollments && `${enrollments} matrícula(s)`,
      progress && `${progress} registro(s) de evolução`,
      goals && `${goals} meta(s)`,
      payouts && `${payouts} repasse(s)`,
    ].filter(Boolean)

    console.log(`  ${u.role.padEnd(13)} ${u.email.padEnd(32)} ${partes.join(', ') || '(sem dados atrelados)'}`)
  }

  console.log('\nTotal que sai junto, por cascata:')
  console.log(`  consultas ................ ${totals.appointments}`)
  console.log(`  avaliações ............... ${totals.reviews}`)
  console.log(`  matrículas ............... ${totals.enrollments}`)
  console.log(`  registros de evolução .... ${totals.progress}`)
  console.log(`  metas .................... ${totals.goals}`)
  console.log(`  repasses ................. ${totals.payouts}`)

  // O que fica é tão importante quanto o que sai: um "não mexemos nisso" explícito evita que a
  // pessoa fique na dúvida depois de rodar.
  const restantes = await prisma.user.findMany({
    where: { email: { notIn: DEMO_EMAILS } },
    select: { email: true, role: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log(`\n${restantes.length} conta(s) permanecem intactas:`)
  for (const u of restantes) console.log(`  ${u.role.padEnd(13)} ${u.email}`)

  const admins = restantes.filter((u) => u.role === 'ADMIN')
  if (admins.length === 0) {
    console.log('\n  ATENÇÃO: nenhuma conta ADMIN sobra. Crie uma antes (npm run create-admin),')
    console.log('  ou o painel administrativo fica inacessível.')
  }

  if (!apply) {
    console.log('\nNada foi alterado. Para remover de verdade: npx tsx scripts/demo-cleanup.ts --apply\n')
    return
  }

  const { count } = await prisma.user.deleteMany({ where: { email: { in: DEMO_EMAILS } } })
  console.log(`\n${count} conta(s) removidas.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
