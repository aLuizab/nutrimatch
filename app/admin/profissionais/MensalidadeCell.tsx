'use client'

import { Check, Loader2 } from 'lucide-react'
import { formatDateBR } from '@/lib/format'
import { formatCents } from '@/lib/money'
import type { ProfessionalRow } from './ProfissionaisTable'

/**
 * Estado da mensalidade de um profissional, e o botão de confirmar o pagamento.
 *
 * Existe porque a rota `/api/admin/professionals/[id]/mensalidade` era órfã: registrava o
 * pagamento corretamente, mas nenhuma tela a chamava — não havia como um admin confirmar o mês
 * sem mexer no banco à mão.
 *
 * O botão só aparece em quem tem plano pago. No gratuito não há o que confirmar, e um botão
 * inerte na linha faria o admin clicar e não entender por que nada acontece.
 *
 * Mostra "vencida há N dias" em vez de só a data porque é a contagem que decide ação — e em
 * vermelho, porque esse é o profissional prestes a sair da busca.
 */
export default function MensalidadeCell({
  row,
  busy,
  onRegistrar,
}: {
  row: ProfessionalRow
  busy: boolean
  onRegistrar: (meses: number) => void
}) {
  if (row.mensalidadeCents === 0) {
    return <span className="text-xs text-gray-400">{row.plano ?? 'Sem plano'}</span>
  }

  const ate = row.pagoAte ? new Date(row.pagoAte) : null
  const dias = ate ? Math.ceil((ate.getTime() - Date.now()) / 86_400_000) : null
  const vencida = dias != null && dias < 0

  return (
    <div className="flex flex-col gap-1.5 items-start">
      {ate ? (
        <span className={`text-xs ${vencida ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
          {vencida
            ? `Vencida há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`
            : `Paga até ${formatDateBR(ate)}`}
        </span>
      ) : (
        <span className="text-xs text-red-600 font-medium">Nunca paga</span>
      )}

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onRegistrar(1)}
          disabled={busy}
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
          title={`Registrar 1 mês de ${formatCents(row.mensalidadeCents)}`}
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Pagou o mês
        </button>

        {/* Trimestre existe porque gente paga adiantado, e clicar três vezes seguidas no botão
            de cima convidaria a errar a conta. A rota aceita de 1 a 12 meses. */}
        <button
          onClick={() => onRegistrar(3)}
          disabled={busy}
          className="text-xs text-gray-500 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="Registrar 3 meses de uma vez"
        >
          +3m
        </button>
      </div>
    </div>
  )
}
