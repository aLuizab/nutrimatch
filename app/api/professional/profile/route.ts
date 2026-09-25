import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { SPECIALTY_NAMES } from '@/lib/specialties'
import { extractUf, isCrnValidationError, validateCrn } from '@/lib/crn'
import { validateOffice } from '@/lib/office'

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Nome é obrigatório'),
  crn: z.string().trim().min(3, 'CRN é obrigatório'),
  phone: z.string().trim().optional(),
  specialties: z
    .array(z.enum(SPECIALTY_NAMES))
    .min(1, 'Selecione ao menos uma especialidade')
    .max(3, 'Máximo de 3 especialidades')
    .transform((arr) => [...new Set(arr)]),
  city: z.string().trim().min(2, 'Cidade é obrigatória'),
  price: z.coerce.number().int().min(1, 'Valor inválido'),
  bio: z.string().trim().optional(),
  // Modalidade e endereço não estavam aqui, e a ausência era um buraco: o profissional escolhia
  // o formato no cadastro e nunca mais podia mudá-lo. Entram juntos porque um valida o outro.
  modality: z.enum(['ONLINE', 'PRESENCIAL', 'AMBOS']),
  officeAddress: z.string().trim().max(300, 'Endereço muito longo').optional(),
})

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'professional-profile')
  if (limited) return limited

  const json = await request.json().catch(() => null)
  const parsed = profileSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const data = parsed.data

  const crn = validateCrn(data.crn, extractUf(data.city))
  if (isCrnValidationError(crn)) {
    return NextResponse.json({ error: crn.error }, { status: 400 })
  }

  // A mesma regra do cadastro, conferida de novo: mudar o formato para presencial depois, sem
  // endereço, produziria exatamente o problema que a regra existe para impedir.
  const semEndereco = validateOffice(data.modality, data.officeAddress)
  if (semEndereco) {
    return NextResponse.json({ error: semEndereco }, { status: 400 })
  }

  // Changing the CRN after approval invalidates the verification and sends the profile back
  // for review — otherwise someone could get approved with a real CRN and then swap it.
  const crnChanged = crn.formatted !== user.professional!.crn
  const needsReview = crnChanged && user.professional!.crnVerifiedAt != null

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: data.name, phone: data.phone || null } }),
    prisma.professional.update({
      where: { id: user.professional!.id },
      data: {
        crn: crn.formatted,
        specialties: data.specialties,
        city: data.city,
        price: data.price,
        bio: data.bio || '',
        modality: data.modality,
        // Guardado mesmo quando o formato é só online: quem volta a atender presencialmente não
        // precisa redigitar o endereço que já tinha informado.
        officeAddress: data.officeAddress || null,
        ...(needsReview
          ? { status: 'PENDING', crnVerifiedAt: null, crnVerifiedBy: null }
          : {}),
      },
    }),
  ])

  return NextResponse.json({ ok: true, sentForReview: needsReview })
}
