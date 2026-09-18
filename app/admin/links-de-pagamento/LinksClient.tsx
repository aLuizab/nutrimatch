'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Check, ExternalLink, Link2, Loader2 } from 'lucide-react'
import { formatCents } from '@/lib/money'

interface PlanRow {
  id: string
  name: string
  totalCents: number
  link: string | null
  linkAmountCents: number | null
}

interface ProfessionalRow {
  id: string
  name: string
  email: string
  status: string
  hasPixKey: boolean
  priceCents: number
  link: string | null
  linkAmountCents: number | null
  plans: PlanRow[]
}

export default function LinksClient({ rows }: { rows: ProfessionalRow[] }) {
  const semLink = rows.filter((r) => !r.link).length

  return (
    <>
      <div className="bg-white border-b border-gray-100 px-8 py-5">
        <h1 className="text-xl font-bold text-gray-900">Links de pagamento</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Crie o link no InfinitePay com o valor do profissional e cole aqui. O paciente vê o QR
          code depois de agendar.
        </p>
      </div>

      <div className="p-8 space-y-6">
        {semLink > 0 && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 text-amber-800 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p className="text-sm leading-relaxed">
              {semLink === 1 ? '1 profissional está' : `${semLink} profissionais estão`} sem link.
              Enquanto não houver, a consulta é marcada normalmente e o valor fica combinado
              direto entre paciente e profissional — a plataforma não recebe a taxa.
            </p>
          </div>
        )}

        {rows.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-gray-500">Nenhum profissional cadastrado ainda.</p>
          </div>
        )}

        {rows.map((row) => (
          <div key={row.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-900">{row.name}</h2>
                  {row.status === 'PENDING' && (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      Aguardando aprovação
                    </span>
                  )}
                  {!row.hasPixKey && (
                    <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                      Sem chave Pix
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{row.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Consulta avulsa</p>
                <p className="font-bold text-gray-900">{formatCents(row.priceCents)}</p>
              </div>
            </div>

            {!row.hasPixKey && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4 leading-relaxed">
                Sem chave Pix cadastrada não há para onde repassar os 90%. Enquanto isso, nada é
                cobrado do paciente mesmo com o link preenchido.
              </p>
            )}

            <LinkField
              kind="professional"
              id={row.id}
              label="Link da consulta avulsa"
              expectedCents={row.priceCents}
              link={row.link}
              linkAmountCents={row.linkAmountCents}
            />

            {row.plans.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 space-y-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Pacotes</p>
                {row.plans.map((plan) => (
                  <LinkField
                    key={plan.id}
                    kind="careplan"
                    id={plan.id}
                    label={`${plan.name} — ${formatCents(plan.totalCents)}`}
                    expectedCents={plan.totalCents}
                    link={plan.link}
                    linkAmountCents={plan.linkAmountCents}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}

function LinkField({
  kind,
  id,
  label,
  expectedCents,
  link,
  linkAmountCents,
}: {
  kind: 'professional' | 'careplan'
  id: string
  label: string
  expectedCents: number
  link: string | null
  linkAmountCents: number | null
}) {
  const router = useRouter()
  const [value, setValue] = useState(link ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Link criado para um valor que já não é o de hoje: continua cobrando o antigo e ninguém é
  // avisado. Só aparece aqui, para o admin — o paciente não teria o que fazer com isso.
  const stale = link != null && linkAmountCents != null && linkAmountCents !== expectedCents

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch('/api/admin/payment-links', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, id, url: value.trim() }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar o link.')
        return
      }
      setSaved(true)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <label className="text-xs font-bold text-gray-700 block mb-1.5">{label}</label>

      {stale && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-2 leading-relaxed">
          O link foi criado para {formatCents(linkAmountCents!)} e o valor hoje é{' '}
          {formatCents(expectedCents)}. Gere um link novo no InfinitePay e substitua, ou o
          paciente vai pagar o valor antigo.
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Link2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setSaved(false)
            }}
            placeholder="https://invoice.infinitepay.io/..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <button
          onClick={() => void save()}
          disabled={saving || value.trim() === (link ?? '')}
          className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Salvo' : 'Salvar'}
        </button>

        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 border border-gray-200 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Testar <ExternalLink size={13} />
          </a>
        )}
      </div>

      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
      {!link && !error && (
        <p className="text-xs text-gray-400 mt-1.5">
          Sem link, a cobrança não acontece pela plataforma. Deixe vazio para desligar.
        </p>
      )}
    </div>
  )
}
