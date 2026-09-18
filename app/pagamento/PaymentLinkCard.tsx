import { ExternalLink } from 'lucide-react'
import { formatPrice } from '@/lib/format'

/**
 * O link de pagamento da plataforma, oferecido ao lado do Pix.
 *
 * O valor aparece em destaque porque um link fixo não carrega valor nenhum: quem abre digita a
 * quantia na página do provedor. Sem o número na frente dos olhos, a pessoa chuta.
 *
 * E o aviso de voltar para avisar o pagamento não é enfeite — a conferência é manual dos dois
 * lados, então um pagamento que ninguém declara fica invisível para a plataforma e a consulta
 * não é confirmada.
 */
export default function PaymentLinkCard({
  url,
  amountCents,
}: {
  url: string
  amountCents: number
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900">Pagar com cartão ou outro meio</h2>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Você será levado à página de pagamento da plataforma.
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Valor a pagar</p>
          <p className="text-xl font-bold text-gray-900">{formatPrice(amountCents)}</p>
        </div>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors"
      >
        Abrir página de pagamento <ExternalLink size={15} />
      </a>

      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3 leading-relaxed">
        Confira o valor de {formatPrice(amountCents)} na página de pagamento — o link é o mesmo
        para todas as consultas e não preenche a quantia sozinho. Depois de pagar, volte aqui e
        avise o pagamento abaixo, senão não temos como confirmar sua consulta.
      </p>
    </div>
  )
}
