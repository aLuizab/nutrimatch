import { PrismaClient, type Modality } from '@prisma/client'
import { hashPassword } from '../lib/password'
import { instantAt, spDateString } from '../lib/spdate'
import { recomputeAllRankScores } from '../lib/ranking'

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
  specialties: string[]
  bio: string
  city: string
  modality: Modality
  price: number
}[] = [
  {
    email: 'carolina@nutrimatch.com.br',
    name: 'Dra. Carolina Matos',
    crn: 'CRN-3 12345/D',
    specialties: ['Nutrição Esportiva', 'Nutrição Funcional'],
    bio: 'Especialista em nutrição esportiva e funcional com mais de 8 anos de experiência. Formada pela USP com pós-graduação em Nutrição Esportiva pelo GANEP. Atendo atletas amadores e profissionais, auxiliando no ganho de performance, composição corporal e saúde geral. Minha abordagem é individualizada e baseada em evidências científicas.',
    city: 'São Paulo, SP',
    modality: 'AMBOS',
    price: 150,
  },
  {
    email: 'rafael@nutrimatch.com.br',
    name: 'Dr. Rafael Costa',
    crn: 'CRN-4 22108/D',
    specialties: ['Nutrição Clínica'],
    bio: 'Nutricionista clínico com foco em reeducação alimentar e tratamento de doenças metabólicas. Atendimento 100% online com planos alimentares personalizados e acompanhamento contínuo.',
    city: 'Rio de Janeiro, RJ',
    modality: 'ONLINE',
    price: 120,
  },
  {
    email: 'mariafernanda@nutrimatch.com.br',
    name: 'Dra. Maria Fernanda',
    crn: 'CRN-3 18532/D',
    specialties: ['Nutrição Funcional', 'Nutrição Clínica'],
    bio: 'Nutrição funcional integrativa, investigando a raiz dos desequilíbrios do organismo para propor mudanças reais e duradouras na saúde dos pacientes.',
    city: 'São Paulo, SP',
    modality: 'PRESENCIAL',
    price: 180,
  },
  {
    email: 'juliana@nutrimatch.com.br',
    name: 'Dra. Juliana Torres',
    crn: 'CRN-9 09874/D',
    specialties: ['Nutrição Infantil'],
    bio: 'Especialista em nutrição infantil, ajudando famílias a construir uma relação saudável das crianças com a alimentação desde os primeiros anos.',
    city: 'Belo Horizonte, MG',
    modality: 'AMBOS',
    price: 130,
  },
  {
    email: 'andre@nutrimatch.com.br',
    name: 'Dr. André Lima',
    crn: 'CRN-8 15221/D',
    specialties: ['Nutrição Esportiva'],
    bio: 'Nutrição esportiva voltada para performance e recuperação, com atendimento online para atletas em todo o Brasil.',
    city: 'Curitiba, PR',
    modality: 'ONLINE',
    price: 140,
  },
  {
    email: 'beatriz@nutrimatch.com.br',
    name: 'Dra. Beatriz Oliveira',
    crn: 'CRN-3 27640/D',
    specialties: ['Nutrição Vegana', 'Nutrição Funcional'],
    bio: 'Nutrição 100% vegetal, mostrando que é possível ter uma alimentação saudável, saborosa e alinhada aos seus valores.',
    city: 'São Paulo, SP',
    modality: 'AMBOS',
    price: 110,
  },
  {
    email: 'lucas@nutrimatch.com.br',
    name: 'Dr. Lucas Ferreira',
    crn: 'CRN-2 11903/D',
    specialties: ['Nutrição Clínica'],
    bio: 'Atendimento presencial com foco em emagrecimento sustentável e tratamento de doenças relacionadas à alimentação.',
    city: 'Porto Alegre, RS',
    modality: 'PRESENCIAL',
    price: 100,
  },
  {
    email: 'amanda@nutrimatch.com.br',
    name: 'Dra. Amanda Santos',
    crn: 'CRN-3 31456/D',
    specialties: ['Nutrição Oncológica', 'Nutrição Clínica'],
    bio: 'Nutrição oncológica especializada em apoio nutricional durante e após o tratamento de câncer, em parceria com a equipe médica do paciente.',
    city: 'São Paulo, SP',
    modality: 'AMBOS',
    price: 200,
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

  const passwordHash = await hashPassword(SEED_PASSWORD)

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
            specialties: p.specialties,
            bio: p.bio,
            city: p.city,
            modality: p.modality,
            price: p.price,
            status: 'ACTIVE',
            // Chave Pix fictícia: é o que coloca o profissional no fluxo pago da demonstração.
            // Sem ela, paymentRequirementFor devolve PROFESSIONAL_WITHOUT_PIX e nada é cobrado.
            pixKey: p.email,
            pixKeyType: 'EMAIL',
            crnVerifiedAt: new Date(),
            crnVerifiedBy: 'seed@nutrimatch.com.br',
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

  // Programas de acompanhamento — o diferencial: consultas mais baratas dentro de um programa
  // com duração definida, em vez de consultas avulsas soltas.
  const CARE_PLANS = [
    {
      professional: 'Dra. Carolina Matos',
      name: 'Acompanhamento Esportivo 3 meses',
      description: 'Quatro consultas ao longo de 3 meses com ajuste contínuo do plano alimentar conforme sua evolução de treino e composição corporal.',
      durationMonths: 3,
      consultations: 4,
      pricePerConsultation: 120,
    },
    {
      professional: 'Dra. Carolina Matos',
      name: 'Intensivo 6 meses',
      description: 'Oito consultas em 6 meses para quem busca mudança consistente, com acompanhamento próximo da evolução entre as consultas.',
      durationMonths: 6,
      consultations: 8,
      pricePerConsultation: 110,
    },
    {
      professional: 'Dr. Rafael Costa',
      name: 'Reeducação Alimentar 3 meses',
      description: 'Três consultas online em 3 meses com foco em construir hábitos sustentáveis, não dietas restritivas.',
      durationMonths: 3,
      consultations: 3,
      pricePerConsultation: 95,
    },
    {
      professional: 'Dra. Beatriz Oliveira',
      name: 'Transição Vegana 4 meses',
      description: 'Acompanhamento completo para uma transição segura e nutricionalmente adequada, com quatro consultas e suporte na adaptação.',
      durationMonths: 4,
      consultations: 4,
      pricePerConsultation: 90,
    },
  ]

  const carePlans: Record<string, string> = {}
  for (const p of CARE_PLANS) {
    const created = await prisma.carePlan.create({
      data: {
        professionalId: professionals[p.professional],
        name: p.name,
        description: p.description,
        durationMonths: p.durationMonths,
        consultations: p.consultations,
        pricePerConsultation: p.pricePerConsultation,
      },
    })
    carePlans[p.name] = created.id
  }

  // Ana Silva está no programa de 3 meses da Carolina, começado antes da consulta mais antiga
  // dela, para a divisão programa/avulso ficar coerente com o histórico.
  const anaEnrollment = await prisma.enrollment.create({
    data: {
      carePlanId: carePlans['Acompanhamento Esportivo 3 meses'],
      patientId: patients['Ana Silva'],
      professionalId: professionals['Dra. Carolina Matos'],
      pricePerConsultation: 120,
      consultations: 4,
      listPriceAtEnrollment: 150,
      startedAt: days(-25),
      endsAt: days(65),
    },
  })

  const appointments = [
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: days(-20), modality: 'ONLINE' as Modality, price: 120, reason: 'Retorno', enrollmentId: anaEnrollment.id },
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: days(-10), modality: 'ONLINE' as Modality, price: 120, reason: 'Retorno', enrollmentId: anaEnrollment.id },
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', scheduledAt: hours(1), modality: 'ONLINE' as Modality, price: 120, reason: 'Retorno', enrollmentId: anaEnrollment.id },
    { professional: 'Dra. Carolina Matos', patient: 'Carlos Mendes', scheduledAt: days(-15), modality: 'PRESENCIAL' as Modality, price: 150, reason: 'Primeira consulta', enrollmentId: null },
    { professional: 'Dra. Carolina Matos', patient: 'Carlos Mendes', scheduledAt: hours(6), modality: 'PRESENCIAL' as Modality, price: 150, reason: 'Retorno', enrollmentId: null },
    { professional: 'Dr. Rafael Costa', patient: 'Carlos Mendes', scheduledAt: days(3), modality: 'ONLINE' as Modality, price: 120, reason: 'Primeira consulta', enrollmentId: null },
    { professional: 'Dr. Rafael Costa', patient: 'Fernanda Lopes', scheduledAt: days(-8), modality: 'ONLINE' as Modality, price: 120, reason: 'Retorno', enrollmentId: null },
    { professional: 'Dra. Maria Fernanda', patient: 'Ana Silva', scheduledAt: days(-5), modality: 'PRESENCIAL' as Modality, price: 180, reason: 'Retorno', enrollmentId: null },
  ]

  // Response times per professional, so the weighted ranking has something real to order by.
  // Deliberately varied: fast, average and slow responders, otherwise every score ties.
  const RESPONSE_MINUTES: Record<string, number> = {
    'Dra. Carolina Matos': 25,
    'Dr. Rafael Costa': 90,
    'Dra. Maria Fernanda': 240,
    'Dra. Juliana Torres': 45,
    'Dr. André Lima': 15,
    'Dra. Beatriz Oliveira': 600,
    'Dr. Lucas Ferreira': 1800,
    'Dra. Amanda Santos': 120,
  }

  const createdAppointments: Record<string, string> = {}
  for (const a of appointments) {
    // Booked a little before the consultation, confirmed after this professional's typical
    // delay — createdAt → confirmedAt is exactly what lib/ranking.ts measures.
    const bookedAt = new Date(a.scheduledAt.getTime() - 3 * 24 * 60 * 60 * 1000)
    const delayMs = (RESPONSE_MINUTES[a.professional] ?? 120) * 60 * 1000
    const created = await prisma.appointment.create({
      data: {
        professionalId: professionals[a.professional],
        patientId: patients[a.patient],
        scheduledAt: a.scheduledAt,
        slotHeldAt: a.scheduledAt,
        modality: a.modality,
        price: a.price,
        reason: a.reason,
        status: 'CONFIRMED',
        createdAt: bookedAt,
        confirmedAt: new Date(bookedAt.getTime() + delayMs),
        enrollmentId: a.enrollmentId,
        // Consulta passada já avaliada; futura continua PENDING para exercitar a marcação.
        attendance: a.scheduledAt < now ? 'ATTENDED' : 'PENDING',
        attendanceMarkedAt: a.scheduledAt < now ? a.scheduledAt : null,
      },
    })
    createdAppointments[`${a.professional}|${a.patient}|${a.scheduledAt.toISOString()}`] = created.id
  }

  // Histórico de volume, para os níveis de reputação terem do que sair. Sem isto todo mundo
  // fica em "Novo" (o nível exige consultas realizadas) e as telas de reputação não dizem nada.
  // slotHeldAt fica null: são consultas antigas, não ocupam agenda, e NULL não colide no índice
  // único (professionalId, slotHeldAt).
  const HISTORY: Record<string, { fulfilled: number; noShows: number; lateCancellations: number }> = {
    'Dra. Carolina Matos': { fulfilled: 58, noShows: 2, lateCancellations: 0 },
    'Dr. Rafael Costa': { fulfilled: 24, noShows: 1, lateCancellations: 1 },
    'Dra. Maria Fernanda': { fulfilled: 21, noShows: 0, lateCancellations: 0 },
    'Dra. Juliana Torres': { fulfilled: 11, noShows: 1, lateCancellations: 0 },
    'Dr. André Lima': { fulfilled: 9, noShows: 0, lateCancellations: 0 },
    'Dra. Beatriz Oliveira': { fulfilled: 6, noShows: 0, lateCancellations: 1 },
    'Dr. Lucas Ferreira': { fulfilled: 3, noShows: 0, lateCancellations: 4 },
    'Dra. Amanda Santos': { fulfilled: 5, noShows: 0, lateCancellations: 0 },
  }

  const patientIdList = Object.values(patients)
  let historySlot = 0
  for (const [professionalName, h] of Object.entries(HISTORY)) {
    const professionalId = professionals[professionalName]
    const make = async (
      status: 'CONFIRMED' | 'CANCELLED',
      attendance: 'ATTENDED' | 'NO_SHOW',
      cancelledByProfessional = false
    ) => {
      // Espalha pelos últimos ~6 meses, sempre no passado.
      const scheduledAt = days(-(30 + (historySlot % 150)))
      const bookedAt = new Date(scheduledAt.getTime() - 3 * 24 * 3600_000)
      await prisma.appointment.create({
        data: {
          professionalId,
          patientId: patientIdList[historySlot % patientIdList.length],
          scheduledAt,
          slotHeldAt: null,
          modality: 'ONLINE',
          price: 120,
          status,
          createdAt: bookedAt,
          confirmedAt: new Date(bookedAt.getTime() + 60 * 60 * 1000),
          attendance: status === 'CONFIRMED' ? attendance : 'PENDING',
          attendanceMarkedAt: status === 'CONFIRMED' ? scheduledAt : null,
          ...(cancelledByProfessional
            ? { cancelledAt: new Date(scheduledAt.getTime() - 3600_000), cancelledBy: 'PROFESSIONAL' as const }
            : {}),
        },
      })
      historySlot++
    }

    for (let i = 0; i < h.fulfilled; i++) await make('CONFIRMED', 'ATTENDED')
    for (let i = 0; i < h.noShows; i++) await make('CONFIRMED', 'NO_SHOW')
    for (let i = 0; i < h.lateCancellations; i++) await make('CANCELLED', 'ATTENDED', true)
  }

  // Medidas da Ana com tendência de queda. Uma entrada sem cintura exercita o caminho null
  // no gráfico e na lista.
  const PROGRESS = [
    { daysAgo: 28, weightKg: 78.4, waistCm: 92 },
    { daysAgo: 21, weightKg: 77.6, waistCm: 91 },
    { daysAgo: 14, weightKg: 76.9, waistCm: null },
    { daysAgo: 9, weightKg: 76.2, waistCm: 89.5 },
    { daysAgo: 4, weightKg: 75.5, waistCm: 88 },
    { daysAgo: 1, weightKg: 75.1, waistCm: 87.5 },
  ]
  for (const p of PROGRESS) {
    await prisma.progressEntry.create({
      data: {
        patientId: patients['Ana Silva'],
        // instantAt (UTC-3), não new Date('YYYY-MM-DD') — senão a data exibe um dia antes.
        recordedAt: instantAt(spDateString(days(-p.daysAgo)), '00:00'),
        weightKg: p.weightKg,
        waistCm: p.waistCm,
      },
    })
  }
  await prisma.patient.update({
    where: { id: patients['Ana Silva'] },
    data: { targetWeightKg: 70 },
  })

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
    { professional: 'Dra. Maria Fernanda', patient: 'Carlos Mendes', rating: 5, comment: 'Investigou a fundo meus exames e montou um plano que realmente funcionou. Vale cada centavo.', appointmentKey: null },
    { professional: 'Dr. Rafael Costa', patient: 'Ana Silva', rating: 4, comment: 'Consulta online muito prática, plano alimentar claro e fácil de seguir no dia a dia.', appointmentKey: null },
    { professional: 'Dra. Juliana Torres', patient: 'Fernanda Lopes', rating: 5, comment: 'Minha filha adorou o atendimento. Hoje ela come de tudo, foi uma transformação e tanto.', appointmentKey: null },
    { professional: 'Dra. Juliana Torres', patient: 'Ana Silva', rating: 4, comment: 'Muito paciente com as crianças e com os pais também. Orientações práticas e realistas.', appointmentKey: null },
    { professional: 'Dr. André Lima', patient: 'Carlos Mendes', rating: 5, comment: 'Meu desempenho nos treinos melhorou visivelmente em dois meses. Acompanhamento de perto.', appointmentKey: null },
    { professional: 'Dr. André Lima', patient: 'Fernanda Lopes', rating: 5, comment: 'Atendimento online excelente, sempre disponível para ajustar o plano quando preciso.', appointmentKey: null },
    { professional: 'Dra. Beatriz Oliveira', patient: 'Ana Silva', rating: 5, comment: 'Finalmente uma nutricionista que entende alimentação vegana de verdade. Recomendo muito!', appointmentKey: null },
    { professional: 'Dra. Beatriz Oliveira', patient: 'Fernanda Lopes', rating: 4, comment: 'Plano bem montado e saboroso. Só senti falta de mais opções de receitas rápidas.', appointmentKey: null },
    { professional: 'Dr. Lucas Ferreira', patient: 'Carlos Mendes', rating: 4, comment: 'Atendimento presencial atencioso, consultório bem localizado. Estou tendo bons resultados.', appointmentKey: null },
    { professional: 'Dr. Lucas Ferreira', patient: 'Ana Silva', rating: 5, comment: 'Emagreci de forma saudável e sem sofrimento. Abordagem realista e acolhedora.', appointmentKey: null },
    { professional: 'Dra. Amanda Santos', patient: 'Fernanda Lopes', rating: 5, comment: 'Apoio fundamental durante o tratamento da minha mãe. Profissional extremamente preparada.', appointmentKey: null },
    { professional: 'Dra. Amanda Santos', patient: 'Carlos Mendes', rating: 5, comment: 'Trabalho impecável em conjunto com a equipe médica. Fez toda a diferença na recuperação.', appointmentKey: null },
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

  // rating/reviewCount are denormalized columns — compute them from the reviews just
  // created so the displayed numbers always match the review list.
  for (const professionalId of Object.values(professionals)) {
    const agg = await prisma.review.aggregate({
      where: { professionalId },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.professional.update({
      where: { id: professionalId },
      data: { rating: Math.round((agg._avg.rating ?? 0) * 10) / 10, reviewCount: agg._count },
    })
  }

  const scored = await recomputeAllRankScores()
  console.log(`Ranking recalculado para ${scored} profissionais.`)

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
