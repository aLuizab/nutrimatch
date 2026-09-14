'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Clock, ShieldCheck } from 'lucide-react'
import { formatCents } from '@/lib/money'

/**
 * Tela de pagamento por Pix. O paciente copia o código, paga no app do banco e volta para
 * declarar que pagou.
 *
 * A declaração **não** confirma nada sozinha: chave Pix estática não avisa a plataforma quando
 * o dinheiro cai, então alguém confere o extrato antes de a consulta seguir. A tela diz isso em
 * vez de fingir confirmação instantânea — prometer "pago!" e o profissional depois descobrir
 * que não entrou nada seria pior do que a espera honesta.
 */
export default function PixCheckout({
  kind,
  id,
  payload,
  txid,
  amountCents,
  title,
  subtitle,
  alreadyClaimed,
  deadlineLabel,
}: {
  kind: 'consulta' | 'pacote'
  id: string
  payload: string
  txid: string
  amountCents: number
  title: string
  subtitle: string
  alreadyClaimed: boolean
  deadlineLabel: string | null
}) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(alreadyClaimed)

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setError('Não foi possível copiar. Selecione o código e copie manualmente.')
    }
  }

  async function declarePaid() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/pagamentos/${kind}/${id}/declarar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível registrar seu pagamento')
        return
      }
      setClaimed(true)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (claimed) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="text-emerald-500" size={26} />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Recebemos seu aviso de pagamento</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-md mx-auto">
          Vamos conferir a entrada de <strong>{formatCents(amountCents)}</strong> e confirmar. Você
          recebe um e-mail assim que estiver confirmado — normalmente em algumas horas, em dia
          útil.
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Identificador desta cobrança: <span className="font-mono">{txid}</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        <p className="text-3xl font-bold text-gray-900 mt-4">{formatCents(amountCents)}</p>
        {deadlineLabel && (
          <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
            <Clock size={13} /> Pague até {deadlineLabel} — depois disso o horário volta a ficar
            disponível para outra pessoa.
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Pix copia e cola</h2>
        <p className="text-sm text-gray-500 mb-4">
          Copie o código abaixo e cole na opção <strong>Pix Copia e Cola</strong> do app do seu
          banco. O valor e o identificador já vão junto.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
          <p className="font-mono text-[11px] text-gray-600 break-all leading-relaxed">{payload}</p>
        </div>

        <button
          onClick={copy}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          {copied ? <Check size={17} /> : <Copy size={17} />}
          {copied ? 'Código copiado!' : 'Copiar código Pix'}
        </button>

        <p className="text-xs text-gray-400 mt-3 text-center">
          Identificador: <span className="font-mono">{txid}</span> — ele aparece no comprovante e
          é o que usamos para localizar seu pagamento.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-900 mb-1">Já pagou?</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Avise aqui depois de pagar. Nós conferimos a entrada no extrato e confirmamos — não é
          automático, então pode levar algumas horas.
        </p>
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-3">{error}</div>
        )}
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Opcional: código do comprovante (E2E)"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          onClick={declarePaid}
          disabled={saving}
          className="w-full mt-3 border border-emerald-200 text-emerald-700 font-bold py-3 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-60"
        >
          {saving ? 'Registrando...' : 'Já fiz o pagamento'}
        </button>
      </div>

      <p className="flex items-start gap-2 text-xs text-gray-400 leading-relaxed px-1">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        O pagamento é feito para a NutriMatch, que repassa ao profissional descontada a taxa da
        plataforma. Veja a{' '}
        <a href="/politica-de-cancelamento" target="_blank" className="underline hover:text-gray-600">
          política de cancelamento e reembolso
        </a>
        .
      </p>
    </div>
  )
}
