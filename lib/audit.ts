import type { Role } from '@prisma/client'
import { prisma } from './prisma'

// LGPD Art. 37 — records of processing operations over sensitive data. Fire-and-forget: an
// audit write must never break the page the user is loading, but a failure must be visible in
// the logs rather than swallowed.
export type AuditAction =
  | 'PATIENT_HEALTH_DATA_VIEWED'
  | 'PATIENT_LIST_VIEWED'
  | 'PROFESSIONAL_STATUS_CHANGED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET_REQUESTED'
  | 'PASSWORD_RESET_COMPLETED'
  // Dinheiro confirmado ou repassado por alguém tem nome e hora — é o que permite auditar
  // depois quem liberou o quê, já que a conferência do Pix é manual.
  | 'PIX_PAYMENT_CONFIRMED'
  | 'PIX_PAYMENT_REJECTED'
  | 'PAYOUT_MARKED_PAID'
  // A mensalidade decide se o profissional aparece na busca, e quem confirma o pagamento é uma
  // pessoa. Sem registro não há como reconstruir por que alguém sumiu (ou voltou) da lista.
  | 'SUBSCRIPTION_PAYMENT_RECORDED'
  | 'SUBSCRIPTION_CANCELLED'
  // Quem define por qual link o dinheiro do paciente entra precisa ter nome e hora.
  | 'PAYMENT_LINK_UPDATED'

export function audit(args: {
  actorId: string
  actorRole: Role
  action: AuditAction
  subjectId?: string | null
  metadata?: Record<string, unknown>
}) {
  void prisma.auditLog
    .create({
      data: {
        actorId: args.actorId,
        actorRole: args.actorRole,
        action: args.action,
        subjectId: args.subjectId ?? null,
        // Never put the health values themselves in here — this records that access
        // happened, not a second copy of the data.
        metadata: args.metadata ? JSON.stringify(args.metadata) : null,
      },
    })
    .catch((e) => console.error('[audit]', args.action, e))
}
