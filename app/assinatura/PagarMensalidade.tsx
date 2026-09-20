import { ArrowUpRight, Clock } from 'lucide-react'
import { formatCents } from '@/lib/money'

/**
 * Onde o profissional paga a mensalidade.
 *
 * Não há gateway: ele paga num link do InfinitePay cadastrado pelo admin, e um admin confere
 * o extrato e registra o pagamento — o mesmo arranjo que já vale para consulta e para pacote.
 *
 * O texto diz que a liberação não é instantânea porque ela não é. Prometer imediato e demorar
 * horas gera exatamente o tipo de mensagem que consome mais tempo do que o recurso economiza.
 */
export default function PagarMensalidade({
  url,
  amountCents,
  jaPago,
}: {
  url: string | null
  amountCents: number
  jaPago: boolean
}) {
  if (!url) {
    return (
      <p className="text-xs text-gray-400 max-w-xs text-right">
        O link de pagamento deste plano ainda não foi cadastrado. Fale com a administração da
        plataforma.
      </p>
    )
  }

  return (
    <div className="text-right">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 font-bold px-5 py-3 rounded-xl transition-colors ${
          jaPago
            ? 'bg-surface text-gray-900 border border-gray-200 hover:bg-gray-50'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {jaPago ? 'Pagar o próximo mês' : `Pagar ${formatCents(amountCents)}`}
        <ArrowUpRight size={16} />
      </a>
      <p className="text-xs text-gray-400 mt-2 max-w-[15rem] leading-relaxed">
        <Clock size={11} className="inline mb-0.5 mr-1" />
        Depois de pagar, a liberação depende de a administração conferir o comprovante. Costuma
        sair no mesmo dia útil.
      </p>
    </div>
  )
}
