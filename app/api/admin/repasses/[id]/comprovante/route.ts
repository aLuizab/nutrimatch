import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, requireRole } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { audit } from '@/lib/audit'
import { notifyPayoutPaid } from '@/lib/notifications'
import { formatCents } from '@/lib/money'
import { maskPixKey } from '@/lib/pix'
import { markPayoutPaid } from '@/lib/payouts'
import { RECEIPT_RULES, checkUpload, isRejection, storeFile } from '@/lib/stored-files'
import { unexpectedFailure } from '@/lib/api-failures'

// Anexar o comprovante **é** concluir o repasse.
//
// As duas coisas são uma só rota de propósito. Separadas, existiria o estado "pago sem
// comprovante", que é exatamente o que a regra nova proíbe: sem documento, "já te paguei" é só a
// palavra de quem pagou, e o profissional não tem como conferir nada. Juntas, o arquivo e o
// estado nascem no mesmo instante.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let admin
  try {
    admin = await requireRole('ADMIN')
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(admin.id, 'admin-comprovante')
  if (limited) return limited

  const { id } = await params

  try {
    const form = await request.formData().catch(() => null)
    const checked = checkUpload(form?.get('file'), RECEIPT_RULES)
    if (isRejection(checked)) return NextResponse.json({ error: checked.error }, { status: 400 })

    const nota = form?.get('note')
    const note = typeof nota === 'string' && nota.trim() ? nota.trim().slice(0, 200) : undefined

    const payout = await prisma.payout.findUnique({
      where: { id },
      include: { professional: { include: { user: { select: { name: true, email: true } } } } },
    })
    if (!payout) return NextResponse.json({ error: 'Repasse não encontrado' }, { status: 404 })

    // O arquivo é gravado antes da transição, e só então amarrado ao repasse. A ordem inversa
    // deixaria o repasse PAID apontando para um arquivo que talvez não tenha sido gravado.
    const fileId = await storeFile(checked, admin.id)
    const falha = await markPayoutPaid(id, admin.id, fileId, note)
    if (falha) {
      // A transição falhou, então este arquivo não é comprovante de nada. Deixá-lo no banco seria
      // ocupar espaço com um documento que ninguém alcança.
      await prisma.storedFile.delete({ where: { id: fileId } }).catch(() => undefined)
      return NextResponse.json({ error: falha.error }, { status: falha.status })
    }

    // Dinheiro que sai daqui para a conta de alguém nunca sai em silêncio: sem este e-mail o
    // profissional só descobre o repasse conferindo o extrato por conta própria.
    notifyPayoutPaid({
      professionalName: payout.professional.user.name,
      professionalEmail: payout.professional.user.email,
      amountLabel: formatCents(payout.netCents),
      feeLabel: formatCents(payout.grossCents - payout.netCents),
      grossLabel: formatCents(payout.grossCents),
      // A chave do snapshot é a que valia quando o repasse foi criado — é para ela que o
      // dinheiro foi, mesmo que o profissional tenha trocado a chave depois.
      pixKeyMasked: maskPixKey(
        payout.pixKeySnapshot ?? payout.professional.pixKey ?? '',
        payout.professional.pixKeyType
      ),
    })

    audit({
      actorId: admin.id,
      actorRole: 'ADMIN',
      action: 'PAYOUT_MARKED_PAID',
      subjectId: payout.professionalId,
      metadata: { payoutId: id, netCents: payout.netCents, receiptFileId: fileId },
    })

    return NextResponse.json({ ok: true, receiptFileId: fileId })
  } catch (e) {
    return unexpectedFailure('admin-comprovante', e)
  }
}
