import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signSessionToken } from '@/lib/jwt'

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
  crn: z.string().trim().min(3, 'CRN é obrigatório'),
  specialty: z.string().trim().min(2, 'Especialidade é obrigatória'),
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
  const json = await request.json().catch(() => null)
  const parsed = registerSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const data = parsed.data

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return NextResponse.json({ error: 'Já existe uma conta com este e-mail' }, { status: 409 })
  }

  const passwordHash = await hashPassword(data.password)

  const user = await prisma.user.create({
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
                crn: data.crn,
                specialty: data.specialty,
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
}
