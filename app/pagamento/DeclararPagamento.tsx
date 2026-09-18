'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, Loader2 } from 'lucide-react'

/**
 * O aviso de que o paciente pagou.
 *
 * Um link estático do InfinitePay não avisa esta plataforma quando alguém paga — não há webhook
 * contratado, e a conferência é feita no extrato pelo admin. Sem este passo, um pagamento real
 * ficaria invisível aqui e a consulta nunca seria confirmada, o que é a pior forma de falhar:
 * o paciente pagou e acha que está tudo certo.
 *
 * Veio do antigo PixCheckout, que saiu junto com a cobrança por código Pix: nada mais o
 * renderizava e ele desenhava um código que ninguém mais gera. As funções de geração seguem em
 * lib/pix-payments.ts, dormentes, porque a chave Pix continua sendo como o repasse sai.
 */
export default function DeclararPagamento({
  kind,
  id,
  alreadyClaimed,
}: {
  kind: 'consulta' | 'pacote'
  id: string
  alreadyClaimed: boolean
}) {
  const router = useRouter()
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [claimed, setClaimed] = useState(alreadyClaimed)

  if (claimed) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <Clock className="text-emerald-500" size={22} />
        </div>
        <h2 className="font-bold text-gray-900">Recebemos seu aviso de pagamento</h2>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed max-w-md mx-auto">
          Vamos conferir a entrada e confirmar. Você recebe um e-mail assim que estiver
          confirmado — normalmente em algumas horas, em dia útil.
        </p>
      </div>
    )
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
        const data = await res.json().catch(() => ({}) as { error?: string })
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

  return (
    <div>
      <h2 className="font-bold text-gray-900">Já pagou?</h2>
      <p className="text-sm text-gray-500 mt-1 leading-relaxed">
        Avise aqui para conferirmos e confirmarmos sua consulta. Sem este aviso não temos como
        saber que o pagamento entrou.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mt-3">
          {error}
        </div>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={140}
        placeholder="Observação (opcional): nome de quem pagou, horário…"
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-3 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />

      <button
        onClick={() => void declarePaid()}
        disabled={saving}
        className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-60"
      >
        {saving && <Loader2 size={15} className="animate-spin" />}
        Já fiz o pagamento
      </button>
    </div>
  )
}
