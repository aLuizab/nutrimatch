import { ExternalLink, ShieldCheck } from 'lucide-react'
import { formatCents } from '@/lib/money'
import { qrDataUrl } from '@/lib/qrcode'
import type { ResolvedPaymentLink } from '@/lib/payment-link'
import DeclararPagamento from './DeclararPagamento'
import Contador from './Contador'

/**
 * A tela de pagamento do paciente: valor, QR e link.
 *
 * O QR existe para quem abriu no computador — quem já está no celular toca no botão. Os dois
 * levam ao mesmo lugar, e o valor aparece grande porque é a primeira coisa que a pessoa procura
 * conferir antes de pagar.
 *
 * link.expectedCents (divergência entre o valor do link e o preço atual) é de propósito ignorado
 * aqui: quem resolve isso é o admin, e mostrar ao paciente que o sistema está inconsistente só
 * destrói a confiança dele sem lhe dar nenhuma ação possível.
 */
export default async function PaymentLinkCard({
  link,
  kind,
  id,
  title,
  subtitle,
  alreadyClaimed,
  deadlineLabel,
  deadlineISO,
}: {
  link: ResolvedPaymentLink
  kind: 'consulta' | 'pacote'
  id: string
  title: string
  subtitle: string
  alreadyClaimed: boolean
  deadlineLabel: string | null
  /** Prazo cru, para o contador. Null quando não há relógio correndo (ex.: já avisou). */
  deadlineISO: string | null
}) {
  const qr = await qrDataUrl(link.url)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="text-center pb-6 border-b border-gray-100">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        <p className="text-3xl font-bold text-gray-900 mt-4">{formatCents(link.amountCents)}</p>
        {/* Enquanto o relógio corre, um contador; depois que a pessoa avisa que pagou, só a
            data — porque nesse ponto o prazo deixa de valer e quem decide é a conferência. */}
        {deadlineISO && !alreadyClaimed ? (
          <Contador deadlineISO={deadlineISO} />
        ) : (
          deadlineLabel && (
            <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mt-4 inline-block">
              Reservado até {deadlineLabel}.
            </p>
          )
        )}
      </div>

      <div className="py-6 flex flex-col items-center gap-4">
        {qr && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- data URI gerada no servidor */}
            <img
              src={qr}
              alt="QR code para abrir a página de pagamento"
              width={240}
              height={240}
              className="rounded-xl border border-gray-100"
            />
            <p className="text-xs text-gray-400 text-center max-w-xs leading-relaxed">
              Aponte a câmera do celular para o código, ou use o botão abaixo se já estiver no
              celular.
            </p>
          </>
        )}

        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-3.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Pagar {formatCents(link.amountCents)} <ExternalLink size={15} />
        </a>

        <p className="inline-flex items-center gap-1.5 text-xs text-gray-400">
          <ShieldCheck size={13} />
          Pagamento processado pelo InfinitePay. Aceita Pix e cartão.
        </p>
      </div>

      <div className="pt-6 border-t border-gray-100">
        <DeclararPagamento kind={kind} id={id} alreadyClaimed={alreadyClaimed} />
      </div>
    </div>
  )
}
