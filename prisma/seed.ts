import { PrismaClient, type Modality } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Every seeded account (patients, professionals, admin) shares this password so the
// credentials are easy to remember for a demo — documented in README.md.
const SEED_PASSWORD = 'senha123'

const AVAILABILITY = [
  { weekday: 1, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 2, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 3, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 4, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 5, startTime: '09:00', endTime: '15:00', slotMinutes: 50 },
]

const PROFESSIONALS: {
  email: string
  name: string
  crn: string
  specialty: string
  bio: string
  city: string
  modality: Modality
  price: number
  rating: number
  reviewCount: number
}[] = [
  {
    email: 'carolina@nutrimatch.com.br',
    name: 'Dra. Carolina Matos',
    crn: 'CRN-3 · 12.345',
    specialty: 'Nutrição Esportiva',
    bio: 'Especialista em nutrição esportiva e funcional com mais de 8 anos de experiência. Formada pela USP com pós-graduação em Nutrição Esportiva pelo GANEP. Atendo atletas amadores e profissionais, auxiliando no ganho de performance, composição corporal e saúde geral. Minha abordagem é individualizada e baseada em evidências científicas.',
    city: 'São Paulo',
    modality: 'AMBOS',
    price: 150,
    rating: 4.9,
    reviewCount: 47,
  },
  {
    email: 'rafael@nutrimatch.com.br',
    name: 'Dr. Rafael Costa',
    crn: 'CRN-4 · 22.108',
    specialty: 'Nutrição Clínica',
    bio: 'Nutricionista clínico com foco em reeducação alimentar e tratamento de doenças metabólicas. Atendimento 100% online com planos alimentares personalizados e acompanhamento contínuo.',
    city: 'Rio de Janeiro',
    modality: 'ONLINE',
    price: 120,
    rating: 4.8,
    reviewCount: 62,
  },
  {
    email: 'mariafernanda@nutrimatch.com.br',
    name: 'Dra. Maria Fernanda',
    crn: 'CRN-3 · 18.532',
    specialty: 'Nutrição Funcional',
    bio: 'Nutrição funcional integrativa, investigando a raiz dos desequilíbrios do organismo para propor mudanças reais e duradouras na saúde dos pacientes.',
    city: 'São Paulo',
    modality: 'PRESENCIAL',
    price: 180,
    rating: 5.0,
    reviewCount: 31,
  },
  {
    email: 'juliana@nutrimatch.com.br',
    name: 'Dra. Juliana Torres',
    crn: 'CRN-6 · 09.874',
    specialty: 'Nutrição Infantil',
    bio: 'Especialista em nutrição infantil, ajudando famílias a construir uma relação saudável das crianças com a alimentação desde os primeiros anos.',
    city: 'Belo Horizonte',
    modality: 'AMBOS',
    price: 130,
    rating: 4.7,
    reviewCount: 58,
  },
  {
    email: 'andre@nutrimatch.com.br',
    name: 'Dr. André Lima',
    crn: 'CRN-8 · 15.221',
    specialty: 'Nutrição Esportiva',
    bio: 'Nutrição esportiva voltada para performance e recuperação, com atendimento online para atletas em todo o Brasil.',
    city: 'Curitiba',
    modality: 'ONLINE',
    price: 140,
    rating: 4.9,
    reviewCount: 44,
  },
  {
    email: 'beatriz@nutrimatch.com.br',
    name: 'Dra. Beatriz Oliveira',
    crn: 'CRN-3 · 27.640',
    specialty: 'Nutrição Vegana',
    bio: 'Nutrição 100% vegetal, mostrando que é possível ter uma alimentação saudável, saborosa e alinhada aos seus valores.',
    city: 'São Paulo',
    modality: 'AMBOS',
    price: 110,
    rating: 4.8,
    reviewCount: 29,
  },
  {
    email: 'lucas@nutrimatch.com.br',
    name: 'Dr. Lucas Ferreira',
    crn: 'CRN-2 · 11.903',
    specialty: 'Nutrição Clínica',
    bio: 'Atendimento presencial com foco em emagrecimento sustentável e tratamento de doenças relacionadas à alimentação.',
    city: 'Porto Alegre',
    modality: 'PRESENCIAL',
    price: 100,
    rating: 4.6,
    reviewCount: 38,
  },
  {
    email: 'amanda@nutrimatch.com.br',
    name: 'Dra. Amanda Santos',
    crn: 'CRN-3 · 31.456',
    specialty: 'Nutrição Oncológica',
    bio: 'Nutrição oncológica especializada em apoio nutricional durante e após o tratamento de câncer, em parceria com a equipe médica do paciente.',
    city: 'São Paulo',
    modality: 'AMBOS',
    price: 200,
    rating: 4.9,
    reviewCount: 25,
  },
]

async function main() {
  // This wipes every user via deleteMany below — safe for a throwaway dev/demo database,
  // catastrophic against a real one. Refuse unless someone deliberately overrides it.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_CONFIRM_PROD !== 'yes') {
    console.error(
      'Refusing to run prisma/seed.ts with NODE_ENV=production — this deletes all users.\n' +
        'For a one-time production bootstrap, use `npx tsx scripts/create-admin.ts` instead.\n' +
        'If you really mean to reset production data, re-run with SEED_CONFIRM_PROD=yes.'
    )
    process.exit(1)
  }

  // Full reset on every run — this is dev/demo seed data, safe to recreate from scratch.
  await prisma.user.deleteMany({})

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 10)

  await prisma.user.create({
    data: {
      name: 'Admin NutriMatch',
      email: 'admin@nutrimatch.com.br',
      passwordHash,
      role: 'ADMIN',
    },
  })

  const professionals: Record<string, string> = {}
  for (const p of PROFESSIONALS) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: 'PROFESSIONAL',
        professional: {
          create: {
            crn: p.crn,
            specialty: p.specialty,
            bio: p.bio,
            city: p.city,
            modality: p.modality,
            price: p.price,
            status: 'ACTIVE',
            rating: p.rating,
            reviewCount: p.reviewCount,
            availabilityRules: { create: AVAILABILITY },
          },
        },
      },
      include: { professional: true },
    })
    professionals[p.name] = user.professional!.id
  }

  const patients: Record<string, string> = {}
  const PATIENTS = [
    { email: 'ana@email.com', name: 'Ana Silva', goal: 'Emagrecimento', city: 'São Paulo' },
    { email: 'carlos@email.com', name: 'Carlos Mendes', goal: 'Hipertrofia', city: 'São Paulo' },
    { email: 'fernanda@email.com', name: 'Fernanda Lopes', goal: 'Saúde geral', city: 'Rio de Janeiro' },
  ]
  for (const p of PATIENTS) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: 'PATIENT',
        patient: { create: { goal: p.goal, city: p.city } },
      },
      include: { patient: true },
    })
    patients[p.name] = user.patient!.id
  }

  const now = new Date()
  const hours = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000)
  const days = (n: number) => hours(n * 24)

  const appointments = [
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: days(-20), modality: 'ONLINE' as Modality, price: 150, reason: 'Retorno' },
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: days(-10), modality: 'ONLINE' as Modality, price: 150, reason: 'Retorno' },
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: hours(1), modality: 'ONLINE' as Modality, price: 150, reason: 'Retorno' },
    { professional: 'Dra. Carolina Matos', patient: 'Carlos Mendes', scheduledAt: days(-15), modality: 'PRESENCIAL' as Modality, price: 150, reason: 'Primeira consulta' },
    { professional: 'Dra. Carolina Matos', patient: 'Carlos Mendes', scheduledAt: hours(6), modality: 'PRESENCIAL' as Modality, price: 150, reason: 'Retorno' },
    { professional: 'Dr. Rafael Costa', patient: 'Carlos Mendes', scheduledAt: days(3), modality: 'ONLINE' as Modality, price: 120, reason: 'Primeira consulta' },
    { professional: 'Dr. Rafael Costa', patient: 'Fernanda Lopes', scheduledAt: days(-8), modality: 'ONLINE' as Modality, price: 120, reason: 'Retorno' },
    { professional: 'Dra. Maria Fernanda', patient: 'Ana Silva', scheduledAt: days(-5), modality: 'PRESENCIAL' as Modality, price: 180, reason: 'Retorno' },
  ]

  const createdAppointments: Record<string, string> = {}
  for (const a of appointments) {
    const created = await prisma.appointment.create({
      data: {
        professionalId: professionals[a.professional],
        patientId: patients[a.patient],
        scheduledAt: a.scheduledAt,
        modality: a.modality,
        price: a.price,
        reason: a.reason,
        status: 'CONFIRMED',
      },
    })
    createdAppointments[`${a.professional}|${a.patient}|${a.scheduledAt.toISOString()}`] = created.id
  }

  const reviews = [
    {
      professional: 'Dra. Carolina Matos',
      patient: 'Ana Silva',
      rating: 5,
      comment: 'Excelente profissional! Mudou completamente minha relação com a alimentação. Superou todas as expectativas.',
      appointmentKey: `Dra. Carolina Matos|Ana Silva|${days(-10).toISOString()}`,
    },
    {
      professional: 'Dra. Carolina Matos',
      patient: 'Carlos Mendes',
      rating: 5,
      comment: 'Muito atenciosa e detalhista. O plano alimentar foi personalizado de verdade para meu estilo de vida.',
      appointmentKey: `Dra. Carolina Matos|Carlos Mendes|${days(-15).toISOString()}`,
    },
    {
      professional: 'Dra. Carolina Matos',
      patient: 'Fernanda Lopes',
      rating: 4,
      comment: 'Ótimo atendimento, plano bem estruturado. Já perdi peso seguindo as orientações.',
      appointmentKey: null,
    },
    {
      professional: 'Dr. Rafael Costa',
      patient: 'Fernanda Lopes',
      rating: 5,
      comment: 'Consulta muito completa, recomendo! Atendimento online tranquilo e muito profissional.',
      appointmentKey: `Dr. Rafael Costa|Fernanda Lopes|${days(-8).toISOString()}`,
    },
    {
      professional: 'Dra. Maria Fernanda',
      patient: 'Ana Silva',
      rating: 5,
      comment: 'Profissional incrível, super recomendo. Abordagem funcional fez toda diferença no meu tratamento.',
      appointmentKey: `Dra. Maria Fernanda|Ana Silva|${days(-5).toISOString()}`,
    },
  ]

  for (const r of reviews) {
    await prisma.review.create({
      data: {
        professionalId: professionals[r.professional],
        patientId: patients[r.patient],
        appointmentId: r.appointmentKey ? createdAppointments[r.appointmentKey] ?? null : null,
        rating: r.rating,
        comment: r.comment,
      },
    })
  }

  console.log('Seed complete.')
  console.log(`Admin login:        admin@nutrimatch.com.br / ${SEED_PASSWORD}`)
  console.log(`Professional login: carolina@nutrimatch.com.br / ${SEED_PASSWORD}`)
  console.log(`Patient login:      ana@email.com / ${SEED_PASSWORD}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
