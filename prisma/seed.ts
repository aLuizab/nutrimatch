import { PrismaClient, type Modality } from '@prisma/client'
import { hashPassword } from '../lib/password'
import { instantAt, spDateString } from '../lib/spdate'
import { recomputeAllRankScores } from '../lib/ranking'
import { TERMS_VERSION } from '../lib/terms'

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

// Dez perfis para a demonstração, cobrindo as sete especialidades e os quatro níveis de
// reputação. A variedade é de propósito: uma vitrine em que todo mundo tem 5,0 e "Referência"
// não mostra o produto, mostra um enfeite — e é justamente o ranking que precisa ficar visível.
//
// `officeAddress` é obrigatório em quem atende presencialmente. Sem ele, effectiveModality
// rebaixa o perfil para ONLINE (ver lib/office.ts) e metade da demonstração some.
const PROFESSIONALS: {
  email: string
  name: string
  crn: string
  specialties: string[]
  bio: string
  city: string
  modality: Modality
  officeAddress?: string
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
    officeAddress: 'Rua dos Pinheiros, 1240, conjunto 82 — Pinheiros, São Paulo/SP',
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
    officeAddress: 'Alameda Santos, 455, sala 1108 — Cerqueira César, São Paulo/SP',
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
    officeAddress: 'Rua Pernambuco, 1077, sala 304 — Savassi, Belo Horizonte/MG',
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
    specialties: ['Nutrição Vegana', 'Nutrição Funcional', 'Nutrição Clínica'],
    bio: 'Nutrição 100% vegetal, mostrando que é possível ter uma alimentação saudável, saborosa e alinhada aos seus valores. Atendo também quem está reduzindo o consumo de origem animal aos poucos, sem radicalismo.',
    city: 'São Paulo, SP',
    modality: 'AMBOS',
    officeAddress: 'Rua Harmonia, 862, casa 2 — Vila Madalena, São Paulo/SP',
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
    officeAddress: 'Av. Carlos Gomes, 222, sala 607 — Boa Vista, Porto Alegre/RS',
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
    officeAddress: 'Rua Joaquim Floriano, 940, conjunto 51 — Itaim Bibi, São Paulo/SP',
    price: 200,
  },
  {
    email: 'patricia@nutrimatch.com.br',
    name: 'Dra. Patrícia Nogueira',
    crn: 'CRN-3 24099/D',
    specialties: ['Nutrição Estética', 'Nutrição Funcional', 'Nutrição Clínica'],
    bio: 'Nutrição estética com base clínica: cuido de pele, cabelo e composição corporal olhando primeiro para exames, intestino e sono — porque o que aparece por fora quase sempre começa por dentro. Nada de protocolo pronto.',
    city: 'Campinas, SP',
    modality: 'AMBOS',
    officeAddress: 'Av. Barão de Itapura, 2294, sala 12 — Botafogo, Campinas/SP',
    price: 160,
  },
  {
    email: 'thiago@nutrimatch.com.br',
    name: 'Dr. Thiago Almeida',
    crn: 'CRN-10 07731/D',
    specialties: ['Nutrição Esportiva', 'Nutrição Clínica', 'Nutrição Estética'],
    bio: 'Atendo corredores, triatletas e quem treina por saúde. Trabalho com periodização alimentar alinhada ao calendário de provas e acompanhamento de composição corporal ao longo da temporada. Consultas online, com retorno por mensagem entre as sessões.',
    city: 'Florianópolis, SC',
    modality: 'ONLINE',
    price: 135,
  },
]

/**
 * O host do banco, para a trava abaixo saber contra o que está apontando.
 *
 * Só o host, nunca a senha: esta string vai para o terminal e para o log de quem rodou.
 */
function hostDoBanco(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? '').host || '(desconhecido)'
  } catch {
    return '(DATABASE_URL inválida ou ausente)'
  }
}

const HOSTS_LOCAIS = ['localhost', '127.0.0.1', '::1', 'host.docker.internal']

async function main() {
  const host = hostDoBanco()
  const ehLocal = HOSTS_LOCAIS.some((h) => host.startsWith(h))

  // Duas travas, porque uma não bastou.
  //
  // A primeira olha NODE_ENV. Ela não protege o caso que mais acontece: o `.env` da máquina de
  // quem desenvolve aponta para o banco de produção (ver docs/FLUXO-DE-TRABALHO.md — dados reais
  // já foram apagados assim uma vez), e ali NODE_ENV não é 'production'. A trava passava, o
  // deleteMany rodava, e os usuários de verdade iam com ele.
  //
  // A segunda olha para onde a DATABASE_URL aponta de fato. Banco remoto exige confirmação
  // explícita, independentemente de NODE_ENV. Continua sendo possível semear o banco da
  // demonstração — é só dizer que é isso que se quer.
  if (process.env.NODE_ENV === 'production' && process.env.SEED_CONFIRM_PROD !== 'yes') {
    console.error(
      `Recusando rodar prisma/seed.ts com NODE_ENV=production — isto APAGA todos os usuários de ${host}.\n` +
        'Para criar só o admin num banco de verdade, use `npx tsx scripts/create-admin.ts`.\n' +
        'Se é mesmo para zerar produção, rode de novo com SEED_CONFIRM_PROD=yes.'
    )
    process.exit(1)
  }

  if (!ehLocal && process.env.SEED_CONFIRM_REMOTE !== 'yes') {
    console.error(
      `\n  ⚠  A DATABASE_URL aponta para um banco REMOTO: ${host}\n\n` +
        '  Este script começa com `prisma.user.deleteMany({})`. Num banco remoto isso apaga\n' +
        '  pacientes, nutricionistas, consultas, pagamentos e repasses reais — sem desfazer.\n\n' +
        '  Se você quer mesmo semear ESTE banco (por exemplo, o da demonstração):\n' +
        '      SEED_CONFIRM_REMOTE=yes npm run seed\n\n' +
        '  Se o que você queria era semear um banco local, corrija a DATABASE_URL primeiro.\n'
    )
    process.exit(1)
  }

  if (!ehLocal) {
    console.log(`Semeando banco REMOTO ${host} (SEED_CONFIRM_REMOTE=yes).`)
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
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
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
        // Contas de demonstração também registram aceite: um perfil sem ele apareceria no painel
        // como pendência, e a demonstração passaria a mostrar um problema que não existe.
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
        professional: {
          create: {
            crn: p.crn,
            specialties: p.specialties,
            bio: p.bio,
            city: p.city,
            modality: p.modality,
            officeAddress: p.officeAddress ?? null,
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
  // Nove pacientes, e não três, por causa das avaliações: com três, a vitrine mostrava a mesma
  // pessoa avaliando seis nutricionistas, e uma avaliação que se repete parece o que é — semeada.
  // Os três primeiros continuam sendo os de login da demonstração; o resto existe para dar nome
  // às avaliações.
  const PATIENTS = [
    { email: 'ana@email.com', name: 'Ana Silva', goal: 'Emagrecimento', city: 'São Paulo' },
    { email: 'carlos@email.com', name: 'Carlos Mendes', goal: 'Hipertrofia', city: 'São Paulo' },
    { email: 'fernanda@email.com', name: 'Fernanda Lopes', goal: 'Saúde geral', city: 'Rio de Janeiro' },
    { email: 'juliana.reis@email.com', name: 'Juliana Reis', goal: 'Emagrecimento', city: 'Campinas' },
    { email: 'marcos@email.com', name: 'Marcos Tavares', goal: 'Hipertrofia', city: 'Florianópolis' },
    { email: 'patricia.alves@email.com', name: 'Patrícia Alves', goal: 'Saúde geral', city: 'Belo Horizonte' },
    { email: 'rodrigo@email.com', name: 'Rodrigo Nunes', goal: 'Controle de doenças', city: 'Porto Alegre' },
    { email: 'camila@email.com', name: 'Camila Duarte', goal: 'Saúde geral', city: 'São Paulo' },
    { email: 'eduardo@email.com', name: 'Eduardo Prado', goal: 'Emagrecimento', city: 'Curitiba' },
  ]
  for (const p of PATIENTS) {
    const user = await prisma.user.create({
      data: {
        name: p.name,
        email: p.email,
        passwordHash,
        role: 'PATIENT',
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
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
    'Dra. Patrícia Nogueira': { fulfilled: 33, noShows: 1, lateCancellations: 0 },
    'Dr. Thiago Almeida': { fulfilled: 16, noShows: 2, lateCancellations: 1 },
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

  // Avaliações da demonstração. Quatro a seis por profissional, de pacientes diferentes e com
  // notas variadas — não porque o número seja bonito, mas porque com duas avaliações cada o
  // encolhimento bayesiano (PRIOR_WEIGHT = 8 em lib/ranking.ts) puxava todo mundo para a média da
  // plataforma e o ranking saía embolado: quem tinha 3 consultas aparecia acima de quem tinha 58.
  // Com volume, a nota volta a separar as pessoas — que é o que a busca precisa demonstrar.
  //
  // Os comentários são todos distintos de propósito. Texto repetido em dois perfis é o detalhe
  // que denuncia uma vitrine montada, e é justamente nele que o olho de quem visita a feira cai.
  const reviews = [
    // ── Dra. Carolina Matos — esportiva + funcional, a mais estabelecida ─────────────────
    { professional: 'Dra. Carolina Matos', patient: 'Ana Silva', rating: 5, comment: 'Excelente profissional! Mudou completamente minha relação com a alimentação. Superou todas as expectativas.', appointmentKey: `Dra. Carolina Matos|Ana Silva|${days(-10).toISOString()}` },
    { professional: 'Dra. Carolina Matos', patient: 'Carlos Mendes', rating: 5, comment: 'Muito atenciosa e detalhista. O plano alimentar foi personalizado de verdade para meu estilo de vida.', appointmentKey: `Dra. Carolina Matos|Carlos Mendes|${days(-15).toISOString()}` },
    { professional: 'Dra. Carolina Matos', patient: 'Fernanda Lopes', rating: 5, comment: 'Ótimo atendimento, plano bem estruturado. Já perdi peso seguindo as orientações.', appointmentKey: null },
    { professional: 'Dra. Carolina Matos', patient: 'Marcos Tavares', rating: 5, comment: 'Treino pesado e ela soube encaixar a alimentação sem me fazer viver de frango com batata. Fez diferença na recuperação entre os treinos.', appointmentKey: null },
    { professional: 'Dra. Carolina Matos', patient: 'Camila Duarte', rating: 5, comment: 'Pontual, prepara a consulta antes e cobra retorno. Senti que tinha alguém acompanhando de verdade, não só entregando papel.', appointmentKey: null },
    { professional: 'Dra. Carolina Matos', patient: 'Eduardo Prado', rating: 4, comment: 'Muito boa. Só demorei a me adaptar ao volume de comida do plano inicial, mas ela ajustou rápido quando falei.', appointmentKey: null },

    // ── Dr. Rafael Costa — clínica, online ──────────────────────────────────────────────
    { professional: 'Dr. Rafael Costa', patient: 'Fernanda Lopes', rating: 5, comment: 'Consulta muito completa, recomendo! Atendimento online tranquilo e muito profissional.', appointmentKey: `Dr. Rafael Costa|Fernanda Lopes|${days(-8).toISOString()}` },
    { professional: 'Dr. Rafael Costa', patient: 'Ana Silva', rating: 4, comment: 'Consulta online muito prática, plano alimentar claro e fácil de seguir no dia a dia.', appointmentKey: null },
    { professional: 'Dr. Rafael Costa', patient: 'Rodrigo Nunes', rating: 5, comment: 'Cheguei com pré-diabetes e hemoglobina glicada alta. Seis meses depois, exames normalizados e sem dieta de sofrimento.', appointmentKey: null },
    { professional: 'Dr. Rafael Costa', patient: 'Patrícia Alves', rating: 4, comment: 'Explica muito bem o porquê de cada coisa. A consulta é longa, o que é bom, mas exige tempo livre de verdade.', appointmentKey: null },
    { professional: 'Dr. Rafael Costa', patient: 'Eduardo Prado', rating: 5, comment: 'Online funcionou melhor do que eu esperava. Recebo o plano no mesmo dia e dá para tirar dúvida depois.', appointmentKey: null },

    // ── Dra. Maria Fernanda — funcional + clínica, presencial ───────────────────────────
    { professional: 'Dra. Maria Fernanda', patient: 'Ana Silva', rating: 5, comment: 'Profissional incrível, super recomendo. Abordagem funcional fez toda diferença no meu tratamento.', appointmentKey: `Dra. Maria Fernanda|Ana Silva|${days(-5).toISOString()}` },
    { professional: 'Dra. Maria Fernanda', patient: 'Carlos Mendes', rating: 5, comment: 'Investigou a fundo meus exames e montou um plano que realmente funcionou. Vale cada centavo.', appointmentKey: null },
    { professional: 'Dra. Maria Fernanda', patient: 'Camila Duarte', rating: 5, comment: 'Foi a primeira que olhou meu intestino antes de falar de peso. Mudou tudo, inclusive o sono.', appointmentKey: null },
    { professional: 'Dra. Maria Fernanda', patient: 'Juliana Reis', rating: 4, comment: 'Atendimento excelente e consultório muito bom. O valor é mais alto que a média, mas entrega o que promete.', appointmentKey: null },
    { professional: 'Dra. Maria Fernanda', patient: 'Patrícia Alves', rating: 5, comment: 'Saí da consulta entendendo meus próprios exames pela primeira vez na vida.', appointmentKey: null },

    // ── Dra. Juliana Torres — infantil ──────────────────────────────────────────────────
    { professional: 'Dra. Juliana Torres', patient: 'Fernanda Lopes', rating: 5, comment: 'Minha filha adorou o atendimento. Hoje ela come de tudo, foi uma transformação e tanto.', appointmentKey: null },
    { professional: 'Dra. Juliana Torres', patient: 'Ana Silva', rating: 4, comment: 'Muito paciente com as crianças e com os pais também. Orientações práticas e realistas.', appointmentKey: null },
    { professional: 'Dra. Juliana Torres', patient: 'Patrícia Alves', rating: 5, comment: 'Meu filho é seletivo e eu já tinha desistido. Ela montou um plano por etapas e funcionou sem briga na mesa.', appointmentKey: null },
    { professional: 'Dra. Juliana Torres', patient: 'Juliana Reis', rating: 5, comment: 'Acolhedora com a mãe também, o que ninguém tinha feito antes. Saí sem culpa e com um caminho.', appointmentKey: null },

    // ── Dr. André Lima — esportiva, online ──────────────────────────────────────────────
    { professional: 'Dr. André Lima', patient: 'Carlos Mendes', rating: 5, comment: 'Meu desempenho nos treinos melhorou visivelmente em dois meses. Acompanhamento de perto.', appointmentKey: null },
    { professional: 'Dr. André Lima', patient: 'Fernanda Lopes', rating: 5, comment: 'Atendimento online excelente, sempre disponível para ajustar o plano quando preciso.', appointmentKey: null },
    { professional: 'Dr. André Lima', patient: 'Marcos Tavares', rating: 4, comment: 'Bom para quem já treina sério. Se você está começando, talvez seja técnico demais no começo.', appointmentKey: null },
    { professional: 'Dr. André Lima', patient: 'Eduardo Prado', rating: 5, comment: 'Suplementação explicada com critério, sem empurrar nada. Confiança total.', appointmentKey: null },

    // ── Dra. Beatriz Oliveira — vegana + funcional + clínica ────────────────────────────
    { professional: 'Dra. Beatriz Oliveira', patient: 'Ana Silva', rating: 5, comment: 'Finalmente uma nutricionista que entende alimentação vegana de verdade. Recomendo muito!', appointmentKey: null },
    { professional: 'Dra. Beatriz Oliveira', patient: 'Fernanda Lopes', rating: 4, comment: 'Plano bem montado e saboroso. Só senti falta de mais opções de receitas rápidas.', appointmentKey: null },
    { professional: 'Dra. Beatriz Oliveira', patient: 'Camila Duarte', rating: 5, comment: 'Estava anêmica desde que parei de comer carne. Ela resolveu com comida e um suplemento só, sem drama.', appointmentKey: null },
    { professional: 'Dra. Beatriz Oliveira', patient: 'Juliana Reis', rating: 5, comment: 'Eu só queria reduzir a carne, não virar vegana, e ela respeitou isso do começo ao fim.', appointmentKey: null },

    // ── Dr. Lucas Ferreira — clínica, presencial, perfil ainda novo ─────────────────────
    { professional: 'Dr. Lucas Ferreira', patient: 'Carlos Mendes', rating: 4, comment: 'Atendimento presencial atencioso, consultório bem localizado. Estou tendo bons resultados.', appointmentKey: null },
    { professional: 'Dr. Lucas Ferreira', patient: 'Ana Silva', rating: 5, comment: 'Emagreci de forma saudável e sem sofrimento. Abordagem realista e acolhedora.', appointmentKey: null },
    { professional: 'Dr. Lucas Ferreira', patient: 'Rodrigo Nunes', rating: 4, comment: 'Gostei da consulta e do plano. Já precisei remarcar duas vezes por mudança na agenda dele.', appointmentKey: null },

    // ── Dra. Amanda Santos — oncológica + clínica ───────────────────────────────────────
    { professional: 'Dra. Amanda Santos', patient: 'Fernanda Lopes', rating: 5, comment: 'Apoio fundamental durante o tratamento da minha mãe. Profissional extremamente preparada.', appointmentKey: null },
    { professional: 'Dra. Amanda Santos', patient: 'Carlos Mendes', rating: 5, comment: 'Trabalho impecável em conjunto com a equipe médica. Fez toda a diferença na recuperação.', appointmentKey: null },
    { professional: 'Dra. Amanda Santos', patient: 'Patrícia Alves', rating: 5, comment: 'Durante a quimioterapia eu não conseguia comer nada. Ela achou o que descia e me manteve de pé.', appointmentKey: null },
    { professional: 'Dra. Amanda Santos', patient: 'Camila Duarte', rating: 5, comment: 'Sensibilidade e técnica na mesma consulta. Difícil achar as duas coisas juntas.', appointmentKey: null },

    // ── Dra. Patrícia Nogueira — estética + funcional + clínica ─────────────────────────
    { professional: 'Dra. Patrícia Nogueira', patient: 'Ana Silva', rating: 5, comment: 'Chegei querendo tratar queda de cabelo e saí com os exames explicados de um jeito que ninguém tinha feito antes. Três meses depois, resolvido.', appointmentKey: null },
    { professional: 'Dra. Patrícia Nogueira', patient: 'Fernanda Lopes', rating: 5, comment: 'Atenciosa e muito técnica. Explica o porquê de cada mudança, o que faz a gente seguir de verdade.', appointmentKey: null },
    { professional: 'Dra. Patrícia Nogueira', patient: 'Carlos Mendes', rating: 4, comment: 'Ótimo acompanhamento. O consultório em Campinas é fácil de chegar e o atendimento é pontual.', appointmentKey: null },
    { professional: 'Dra. Patrícia Nogueira', patient: 'Juliana Reis', rating: 5, comment: 'Ela não prometeu resultado em duas semanas, e foi por isso que eu confiei. Deu certo no tempo que ela disse.', appointmentKey: null },
    { professional: 'Dra. Patrícia Nogueira', patient: 'Camila Duarte', rating: 5, comment: 'Pele e unhas melhoraram muito, mas o que mais mudou foi a energia. Não esperava por essa.', appointmentKey: null },

    // ── Dr. Thiago Almeida — esportiva + clínica + estética, online ─────────────────────
    { professional: 'Dr. Thiago Almeida', patient: 'Carlos Mendes', rating: 5, comment: 'Ajustou minha alimentação para o calendário de provas e cortei oito minutos na meia maratona. Responde rápido entre as consultas.', appointmentKey: null },
    { professional: 'Dr. Thiago Almeida', patient: 'Ana Silva', rating: 4, comment: 'Plano bem montado para quem treina de manhã cedo. Só achei o retorno um pouco espaçado.', appointmentKey: null },
    { professional: 'Dr. Thiago Almeida', patient: 'Marcos Tavares', rating: 5, comment: 'Periodização de verdade, alinhada com o treinador. Primeira vez que os dois falaram a mesma língua.', appointmentKey: null },
    { professional: 'Dr. Thiago Almeida', patient: 'Eduardo Prado', rating: 4, comment: 'Bom atendimento e muito conhecimento. Tive que remarcar uma consulta e a agenda dele estava cheia.', appointmentKey: null },
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
