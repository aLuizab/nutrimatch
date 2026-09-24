import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from '@/lib/jwt'
import { SPECIALTY_NAMES } from '@/lib/specialties'
import { extractUf, isCrnValidationError, validateCrn } from '@/lib/crn'
import { LIMITS, clientIp, rateLimit, tooManyRequests } from '@/lib/rate-limit'
import { notifyWelcome } from '@/lib/notifications'
import { formatCents } from '@/lib/money'
import { PRO_PLAN_SLUG } from '@/lib/subscription'
import { WELCOME_DISCOUNT_PERCENT, claimWelcomeDiscount, welcomeDiscountCode } from '@/lib/welcome-discount'
import { configFailure, unexpectedFailure } from '@/lib/api-failures'

const baseFields = {
  name: z.string().trim().min(2, 'Nome é obrigatório'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  password: z.string().min(8, 'A senha precisa ter no mínimo 8 caracteres'),
  phone: z.string().trim().optional(),
}

const patientSchema = z.object({
  role: z.literal('PATIENT'),
  ...baseFields,
  birthDate: z.string().trim().optional(),
  goal: z.string().trim().optional(),
  city: z.string().trim().optional(),
})

const professionalSchema = z.object({
  role: z.literal('PROFESSIONAL'),
  ...baseFields,
  // Deep-validated below against the declared state — a bare length check would let anyone
  // type anything into a field that claims professional credentials.
  crn: z.string().trim().min(3, 'CRN é obrigatório'),
  specialties: z
    .array(z.enum(SPECIALTY_NAMES))
    .min(1, 'Selecione ao menos uma especialidade')
    .max(3, 'Máximo de 3 especialidades')
    .transform((arr) => [...new Set(arr)]),
  city: z.string().trim().min(2, 'Cidade é obrigatória'),
  price: z.coerce.number().int().min(1, 'Valor inválido'),
  modality: z.enum(['ONLINE', 'PRESENCIAL', 'AMBOS']),
})

const registerSchema = z.discriminatedUnion('role', [patientSchema, professionalSchema])

// Sensible default so a newly approved professional is immediately bookable — they can
// adjust or turn off days in Configurações > Disponibilidade afterward.
const DEFAULT_AVAILABILITY = [
  { weekday: 1, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 2, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 3, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 4, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
  { weekday: 5, startTime: '09:00', endTime: '17:00', slotMinutes: 50 },
]

export async function POST(request: Request) {
  const limit = rateLimit(`register:${clientIp(request)}`, LIMITS.register.limit, LIMITS.register.windowMs)
  if (!limit.allowed) {
    return tooManyRequests(limit, 'Muitas tentativas de cadastro. Tente novamente mais tarde.')
  }

  // Checked before the user row is written. signSessionToken() runs at the very end and throws
  // on a missing JWT_SECRET, so a misconfigured deploy used to create the account and only then
  // fail — leaving an e-mail address taken by an account that could never be signed into.
  const misconfigured = configFailure()
  if (misconfigured) return misconfigured

  const json = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const data = parsed.data

  // CRN is checked before anything is written: format, valid regional council, and whether
  // that council actually covers the state the professional declared.
  let crnFormatted: string | null = null
  if (data.role === 'PROFESSIONAL') {
    const crn = validateCrn(data.crn, extractUf(data.city))
    if (isCrnValidationError(crn)) {
      return NextResponse.json({ error: crn.error }, { status: 400 })
    }
    crnFormatted = crn.formatted
  }

  // This response does tell an unauthenticated caller that an email is registered. Hiding it
  // would mean dropping the auto-login after signup (the Set-Cookie header differs between the
  // two cases, so a "generic" response body alone would be security theatre — trivially
  // defeated by looking at the headers). Accepted trade-off: keep the clear message, which
  // users genuinely need, and make bulk probing impractical via the rate limit above
  // (5/hour/IP). Revisit if signup ever moves to email confirmation, which removes the
  // Set-Cookie tell and makes a generic response actually generic.
  try {
    const existing = await prisma.user.findUnique({ where: { email: data.email } })
    if (existing) {
      return NextResponse.json({ error: 'Já existe uma conta com este e-mail' }, { status: 409 })
    }

    const passwordHash = await hashPassword(data.password)

    const user = await prisma.user.create({
      // O id do paciente volta junto porque a vaga da campanha de boas-vindas é reservada logo
      // abaixo, e buscá-lo de novo seria uma consulta a mais pelo que acabamos de escrever.
      include: { patient: { select: { id: true } } },
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone || null,
        role: data.role,
        ...(data.role === 'PATIENT'
          ? {
              patient: {
                create: {
                  birthDate: data.birthDate ? new Date(data.birthDate) : null,
                  goal: data.goal || null,
                  city: data.city || null,
                },
              },
            }
          : {
              // Self-registered professionals start PENDING and stay out of public search
              // until an admin approves them in /admin/profissionais.
              professional: {
                create: {
                  crn: crnFormatted!,
                  specialties: data.specialties,
                  bio: '',
                  city: data.city,
                  modality: data.modality,
                  price: data.price,
                  status: 'PENDING',
                  availabilityRules: { create: DEFAULT_AVAILABILITY },
                },
              },
            }),
      },
    })

    // Campanha de lançamento: as primeiras pacientes ganham desconto na consulta. Reservado
    // depois do commit, e só para paciente — nutricionista não compra consulta. Se não houver
    // mais vaga (ou a reserva falhar), o cadastro segue igual, só sem o bloco do cupom no e-mail.
    let discount: { code: string; percent: number } | undefined
    if (user.patient) {
      const seq = await claimWelcomeDiscount(user.patient.id).catch((e) => {
        console.error('[welcome-discount]', e)
        return null
      })
      if (seq !== null) discount = { code: welcomeDiscountCode(seq), percent: WELCOME_DISCOUNT_PERCENT }
    }

    // Depois do commit e sem await: e-mail lento não pode atrasar o cadastro de ninguém.
    // O valor da mensalidade sai do plano no banco, não de um número escrito aqui, senão o
    // e-mail passa a mentir no dia em que o preço mudar.
    const plano =
      data.role === 'PROFESSIONAL' ? await prisma.subscriptionPlan.findUnique({ where: { slug: PRO_PLAN_SLUG } }) : null
    notifyWelcome({
      name: user.name,
      email: user.email,
      role: user.role,
      monthlyLabel: plano ? `${formatCents(plano.monthlyPrice)}/mês` : undefined,
      discount,
    })

    const token = await signSessionToken({ userId: user.id, role: user.role })

    const response = NextResponse.json({ role: user.role })
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    })
    return response
  } catch (e) {
    return unexpectedFailure('register', e)
  }
}
