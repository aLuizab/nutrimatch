'use client'

import React, { useState } from 'react'
import { Send, Loader2, Check, AlertTriangle } from 'lucide-react'

type Audience = 'TODOS' | 'PROFISSIONAIS' | 'PACIENTES'

const ROTULOS: Record<Audience, string> = {
  TODOS: 'Todo mundo',
  PROFISSIONAIS: 'Só nutricionistas',
  PACIENTES: 'Só pacientes',
}

export default function ComunicadosClient({
  counts,
  descadastrados,
}: {
  counts: Record<Audience, number>
  descadastrados: number
}) {
  const [audience, setAudience] = useState<Audience>('TODOS')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  // Confirmação em duas etapas: um disparo em massa não tem desfazer, e o mesmo e-mail duas
  // vezes na caixa de todo mundo é o tipo de erro que custa descadastros.
  const [confirmando, setConfirmando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<{ enviados: number; ignorados: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const total = counts[audience]
  const podeEnviar = title.trim().length >= 4 && body.trim().length >= 10 && total > 0

  async function enviar() {
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/comunicados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, title: title.trim(), body: body.trim() }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string; enviados?: number; ignorados?: number })
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível enviar o comunicado.')
        return
      }
      setResultado({ enviados: data.enviados ?? 0, ignorados: data.ignorados ?? 0 })
      setTitle('')
      setBody('')
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setEnviando(false)
      setConfirmando(false)
    }
  }

  return (
    <>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Comunicados</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Novidades e avisos gerais. Todo comunicado leva link de descadastro.
        </p>
      </div>

      <div className="p-8">
        <div className="max-w-2xl space-y-5">
          {resultado && (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-4 py-3">
              <Check size={16} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">
                Comunicado enviado para <strong>{resultado.enviados}</strong>{' '}
                {resultado.enviados === 1 ? 'pessoa' : 'pessoas'}.
                {resultado.ignorados > 0 && (
                  <>
                    {' '}
                    {resultado.ignorados}{' '}
                    {resultado.ignorados === 1 ? 'saiu' : 'saíram'} da lista e não{' '}
                    {resultado.ignorados === 1 ? 'recebeu' : 'receberam'}.
                  </>
                )}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Para quem</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(ROTULOS) as Audience[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => {
                      setAudience(a)
                      setConfirmando(false)
                    }}
                    className={`text-sm font-medium px-4 py-2 rounded-xl border transition-colors ${
                      audience === a
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {ROTULOS[a]}{' '}
                    <span className={audience === a ? 'text-emerald-100' : 'text-gray-400'}>({counts[a]})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Assunto do e-mail</label>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setConfirmando(false)
                }}
                maxLength={120}
                placeholder="Ex.: Agora você pode definir metas na plataforma"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Mensagem</label>
              <textarea
                value={body}
                onChange={(e) => {
                  setBody(e.target.value)
                  setConfirmando(false)
                }}
                rows={9}
                maxLength={4000}
                placeholder={'Escreva normalmente.\n\nLinha em branco separa parágrafos.'}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Texto puro. O nome de quem recebe entra automaticamente na saudação, e o rodapé
                com o descadastro também.
              </p>
            </div>
          </div>

          {confirmando ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={17} className="text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-900">
                    Enviar para {total} {total === 1 ? 'pessoa' : 'pessoas'}?
                  </p>
                  <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                    Não tem como cancelar depois de sair. Confira o assunto e o texto.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => void enviar()}
                  disabled={enviando}
                  className="inline-flex items-center gap-1.5 bg-amber-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-60"
                >
                  {enviando ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                  Sim, enviar agora
                </button>
                <button
                  onClick={() => setConfirmando(false)}
                  disabled={enviando}
                  className="text-sm font-medium text-gray-600 border border-gray-200 bg-white px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-60"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmando(true)}
              disabled={!podeEnviar}
              className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-5 py-3 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-40"
            >
              <Send size={15} />
              {total === 0 ? 'Ninguém para receber' : `Revisar e enviar para ${total}`}
            </button>
          )}

          {descadastrados > 0 && (
            <p className="text-xs text-gray-400">
              {descadastrados} {descadastrados === 1 ? 'pessoa saiu' : 'pessoas saíram'} da lista de
              novidades e não {descadastrados === 1 ? 'recebe' : 'recebem'} comunicados. Avisos sobre
              consultas e conta continuam chegando para elas.
            </p>
          )}
        </div>
      </div>
    </>
  )
}
