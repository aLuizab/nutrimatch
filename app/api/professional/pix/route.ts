import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'

// Endpoint próprio, separado do perfil, por uma razão concreta: a rota de perfil recebe o
// objeto inteiro e sobrescreve o que vier: um save de perfil que não carregasse a chave junto
// apagaria o destino do repasse sem ninguém notar. Chave de recebimento merece um caminho que
// só mexe nela.
const pixSchema = z.object({
  // Vazio é intencional e significa "remover a chave" — o profissional sai do fluxo pago e as
  // consultas dele voltam a ser combinadas diretamente com o paciente.
  pixKey: z.string().trim().max(140),
  pixKeyType: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
})

export async function PATCH(request: Request) {
  let user
  try {
    user = await requireRole('PROFESSIONAL')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'professional-pix')
  if (limited) return limited

  const parsed = pixSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }, { status: 400 })
  }
  const { pixKey, pixKeyType } = parsed.data

  // Validação mínima por tipo. Não dá para verificar se a chave existe de verdade sem falar com
  // um PSP, então o objetivo aqui é só pegar o erro de digitação óbvio antes que ele vire um
  // repasse para o lugar errado — a conferência final é do olho de quem cadastra.
  if (pixKey) {
    const digits = pixKey.replace(/\D/g, '')
    if (pixKeyType === 'CPF' && digits.length !== 11) {
      return NextResponse.json({ error: 'CPF deve ter 11 dígitos' }, { status: 400 })
    }
    if (pixKeyType === 'CNPJ' && digits.length !== 14) {
      return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos' }, { status: 400 })
    }
    if (pixKeyType === 'PHONE' && (digits.length < 10 || digits.length > 13)) {
      return NextResponse.json({ error: 'Telefone deve ter DDD e número' }, { status: 400 })
    }
    if (pixKeyType === 'EMAIL' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pixKey)) {
      return NextResponse.json({ error: 'E-mail inválido' }, { status: 400 })
    }
    if (pixKeyType === 'RANDOM' && pixKey.length < 32) {
      return NextResponse.json({ error: 'Chave aleatória inválida' }, { status: 400 })
    }
  }

  await prisma.professional.update({
    where: { id: user.professional!.id },
    data: {
      pixKey: pixKey || null,
      pixKeyType: pixKey ? pixKeyType : null,
    },
  })

  return NextResponse.json({ ok: true })
}
