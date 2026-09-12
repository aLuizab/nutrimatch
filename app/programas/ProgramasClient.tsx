'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, EyeOff, Eye } from 'lucide-react'
import { formatPrice } from '@/lib/format'

export interface PlanRow {
  id: string
  name: string
  description: string
  durationMonths: number
  consultations: number
  pricePerConsultation: number
  active: boolean
  activeEnrollments: number
}

// Os dois prazos que a plataforma oferece como pacote.
export const PACKAGE_DURATIONS: number[] = [3, 6]

const EMPTY = { name: '', description: '', durationMonths: '3', consultations: '4', pricePerConsultation: '' }

export default function ProgramasClient({ plans, listPrice }: { plans: PlanRow[]; listPrice: number }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY)
    setEditingId(null)
    setCreating(true)
    setError(null)
  }

  function openEdit(p: PlanRow) {
    setForm({
      name: p.name,
      description: p.description,
      durationMonths: String(p.durationMonths),
      consultations: String(p.consultations),
      pricePerConsultation: String(p.pricePerConsultation),
    })
    setEditingId(p.id)
    setCreating(false)
    setError(null)
  }

  function close() {
    setCreating(false)
    setEditingId(null)
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const url = editingId ? `/api/professional/care-plans/${editingId}` : '/api/professional/care-plans'
      const res = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || undefined,
          durationMonths: Number(form.durationMonths),
          consultations: Number(form.consultations),
          pricePerConsultation: Number(form.pricePerConsultation),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar o programa')
        return
      }
      close()
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(p: PlanRow) {
    setTogglingId(p.id)
    setError(null)
    try {
      const res = await fetch(`/api/professional/care-plans/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !p.active }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Não foi possível atualizar o programa')
        return
      }
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setTogglingId(null)
    }
  }

  const monthly = form.consultations && form.durationMonths ? Number(form.consultations) / Number(form.durationMonths) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-gray-900">Meus programas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Seu valor avulso hoje é {formatPrice(listPrice)} por consulta</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          <Plus size={15} /> Criar programa
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5 mb-4">{error}</div>}

      {(creating || editingId) && (
        <form onSubmit={submit} className="border border-gray-100 rounded-xl p-4 mb-5 space-y-3 bg-gray-50/60">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome do programa</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Acompanhamento 3 meses"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1.5">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="O que está incluído e para quem é indicado"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Duração</label>
              {/* 3 e 6 meses são os formatos que a plataforma vende; a duração livre continua
                  disponível para quem já tinha um programa com outro prazo. */}
              <div className="flex gap-1.5">
                {PACKAGE_DURATIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, durationMonths: String(m) })}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                      Number(form.durationMonths) === m
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {m} meses
                  </button>
                ))}
              </div>
              {!PACKAGE_DURATIONS.includes(Number(form.durationMonths)) && (
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={form.durationMonths}
                  onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500 mt-1.5"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Consultas incluídas</label>
              <input
                type="number"
                min={2}
                max={52}
                value={form.consultations}
                onChange={(e) => setForm({ ...form, consultations: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor por consulta (R$)</label>
              <input
                type="number"
                min={1}
                value={form.pricePerConsultation}
                onChange={(e) => setForm({ ...form, pricePerConsultation: e.target.value })}
                placeholder={String(Math.round(listPrice * 0.8))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          {monthly > 0 && (
            <p className="text-xs text-gray-500">
              Cerca de {monthly.toFixed(1).replace('.0', '')} consulta{monthly > 1 ? 's' : ''} por mês.
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={close} className="text-sm font-medium text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
            >
              {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar programa'}
            </button>
          </div>
        </form>
      )}

      {plans.length === 0 && !creating ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm font-medium text-gray-700">Você ainda não oferece nenhum programa</p>
          <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
            Um programa reúne várias consultas ao longo de meses por um valor menor que o avulso. O
            paciente ganha continuidade e acompanhamento da evolução; você ganha previsibilidade e
            uma relação mais longa em vez de consultas soltas.
          </p>
          <button onClick={openCreate} className="mt-4 text-emerald-600 text-sm font-medium hover:underline">
            Criar meu primeiro programa
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((p) => (
            <div key={p.id} className={`border rounded-xl p-4 ${p.active ? 'border-gray-100' : 'border-gray-100 bg-gray-50/60 opacity-70'}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900">{p.name}</h3>
                    {!p.active && (
                      <span className="text-xs font-medium bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                    {p.activeEnrollments > 0 && (
                      <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full">
                        {p.activeEnrollments} em acompanhamento
                      </span>
                    )}
                  </div>
                  {p.description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{p.description}</p>}
                  <p className="text-sm text-gray-600 mt-2">
                    <span className="font-bold text-gray-900">{formatPrice(p.pricePerConsultation)}</span>
                    <span className="text-gray-400"> /consulta · </span>
                    {p.consultations} consultas em {p.durationMonths} {p.durationMonths === 1 ? 'mês' : 'meses'}
                    <span className="text-gray-400"> · avulso {formatPrice(listPrice)}</span>
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    aria-label={`Editar ${p.name}`}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => toggleActive(p)}
                    disabled={togglingId === p.id}
                    aria-label={p.active ? `Desativar ${p.name}` : `Reativar ${p.name}`}
                    className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {p.active ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
