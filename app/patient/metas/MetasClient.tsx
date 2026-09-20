'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Target, Plus, Check, X, Trash2, CalendarClock, TrendingUp, Loader2 } from 'lucide-react'

export interface GoalView {
  id: string
  title: string
  description: string | null
  targetValue: number | null
  currentValue: number | null
  startValue: number | null
  unit: string | null
  dueDate: string | null
  status: 'ACTIVE' | 'ACHIEVED' | 'ABANDONED'
  achievedAt: string | null
  authorName: string
  isMine: boolean
  byProfessional: boolean
}

/** Mesma conta de lib/goals.ts#goalProgress, repetida aqui para a barra reagir sem ida ao servidor. */
function progress(g: GoalView): number | null {
  if (g.targetValue == null || g.currentValue == null) return null
  const start = g.startValue ?? g.currentValue
  if (start === g.targetValue) return g.currentValue === g.targetValue ? 1 : 0
  return Math.max(0, Math.min(1, (g.currentValue - start) / (g.targetValue - start)))
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(iso)
  due.setHours(0, 0, 0, 0)
  return Math.round((due.getTime() - today.getTime()) / 86_400_000)
}

type Call = (url: string, init: RequestInit, id: string | null) => Promise<boolean>

export default function MetasClient({ goals }: { goals: GoalView[] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = goals.filter((g) => g.status === 'ACTIVE')
  const done = goals.filter((g) => g.status === 'ACHIEVED')
  const dropped = goals.filter((g) => g.status === 'ABANDONED')

  const call: Call = async (url, init, id) => {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar. Tente novamente.')
        return false
      }
      router.refresh()
      return true
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
      return false
    } finally {
      setBusyId(null)
    }
  }

  const subtitle =
    active.length === 0
      ? 'Defina o que você quer alcançar e acompanhe o progresso'
      : `${active.length} em andamento` +
        (done.length > 0 ? ` · ${done.length} concluída${done.length > 1 ? 's' : ''}` : '')

  return (
    <>
      <div className="bg-surface border-b border-gray-100 px-8 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Minhas Metas</h1>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          {creating ? <X size={15} /> : <Plus size={15} />}
          {creating ? 'Cancelar' : 'Nova meta'}
        </button>
      </div>

      <div className="p-8 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
        )}

        {creating && (
          <NewGoalForm
            onSubmit={async (body) => {
              const ok = await call('/api/goals', { method: 'POST', body: JSON.stringify(body) }, null)
              if (ok) setCreating(false)
              return ok
            }}
          />
        )}

        {goals.length === 0 && !creating && <EmptyState onStart={() => setCreating(true)} />}

        {active.length > 0 && (
          <section className="space-y-4">
            {active.map((g) => (
              <GoalCard key={g.id} goal={g} busy={busyId === g.id} call={call} />
            ))}
          </section>
        )}

        {done.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Concluídas</h2>
            <div className="space-y-3">
              {done.map((g) => (
                <GoalCard key={g.id} goal={g} busy={busyId === g.id} call={call} />
              ))}
            </div>
          </section>
        )}

        {dropped.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">Abandonadas</h2>
            <div className="space-y-3">
              {dropped.map((g) => (
                <GoalCard key={g.id} goal={g} busy={busyId === g.id} call={call} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Target size={26} />
      </div>
      <h2 className="text-lg font-bold text-gray-900">Nenhuma meta ainda</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-md mx-auto leading-relaxed">
        Meta com número e prazo é mais fácil de acompanhar que intenção. &quot;Beber 2 litros de
        água por dia&quot; funciona melhor que &quot;beber mais água&quot;.
      </p>
      <button
        onClick={onStart}
        className="mt-5 inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
      >
        <Plus size={15} /> Criar minha primeira meta
      </button>
    </div>
  )
}

interface NewGoalBody {
  title: string
  description?: string
  currentValue?: number
  targetValue?: number
  unit?: string
  dueDate?: string
}

function NewGoalForm({ onSubmit }: { onSubmit: (body: NewGoalBody) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setSaving(true)
        await onSubmit({
          title,
          description: description || undefined,
          currentValue: current !== '' ? Number(current) : undefined,
          targetValue: target !== '' ? Number(target) : undefined,
          unit: unit || undefined,
          dueDate: dueDate || undefined,
        })
        setSaving(false)
      }}
      className="bg-surface rounded-2xl border border-emerald-100 shadow-sm p-6 space-y-4"
    >
      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">O que você quer alcançar</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={120}
          placeholder="Ex.: Chegar a 72 kg"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Hoje</label>
          <input
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            type="number"
            step="any"
            placeholder="85"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Objetivo</label>
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            type="number"
            step="any"
            placeholder="72"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Unidade</label>
          <input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            maxLength={12}
            placeholder="kg"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-700 block mb-1.5">Prazo</label>
          <input
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            type="date"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-700 block mb-1.5">
          Observações <span className="font-medium text-gray-400">(opcional)</span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Como você pretende chegar lá"
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
        />
      </div>

      <p className="text-xs text-gray-400">
        Os números são opcionais — sem eles a meta vira um hábito para marcar como concluído.
      </p>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
        Salvar meta
      </button>
    </form>
  )
}

function GoalCard({ goal, busy, call }: { goal: GoalView; busy: boolean; call: Call }) {
  const [value, setValue] = useState('')
  const pct = progress(goal)
  const isActive = goal.status === 'ACTIVE'
  const left = goal.dueDate ? daysUntil(goal.dueDate) : null
  const overdue = isActive && left !== null && left < 0

  const borderTone = overdue
    ? 'border-amber-200'
    : goal.status === 'ACHIEVED'
      ? 'border-emerald-200'
      : 'border-gray-100'

  const dueLabel =
    goal.dueDate == null || left === null
      ? ''
      : overdue
        ? `Venceu em ${formatDate(goal.dueDate)}`
        : left === 0
          ? 'Vence hoje'
          : `${left} dia${left === 1 ? '' : 's'}`

  return (
    <div
      className={`bg-surface rounded-2xl border shadow-sm p-6 ${borderTone} ${
        goal.status === 'ABANDONED' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900">{goal.title}</h3>
            {goal.status === 'ACHIEVED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                <Check size={11} /> Concluída
              </span>
            )}
            {goal.byProfessional && (
              <span className="text-[11px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                Definida por {goal.authorName.split(' ')[0]}
              </span>
            )}
          </div>
          {goal.description && <p className="text-sm text-gray-500 mt-1 leading-relaxed">{goal.description}</p>}
        </div>

        {dueLabel && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${
              overdue ? 'text-amber-700 bg-amber-50 border-amber-100' : 'text-gray-500 bg-gray-50 border-gray-100'
            }`}
          >
            <CalendarClock size={12} />
            {dueLabel}
          </div>
        )}
      </div>

      {pct !== null && (
        <div className="mt-4">
          <div className="flex items-end justify-between mb-1.5">
            <p className="text-sm font-medium text-gray-700">
              {goal.currentValue}
              {goal.unit ? ` ${goal.unit}` : ''}
              <span className="text-gray-400 font-normal">
                {' de '}
                {goal.targetValue}
                {goal.unit ? ` ${goal.unit}` : ''}
              </span>
            </p>
            <p className="text-sm font-bold text-emerald-600">{Math.round(pct * 100)}%</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
        </div>
      )}

      {isActive ? (
        <div className="mt-5 flex items-center gap-2 flex-wrap">
          {goal.targetValue != null && (
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-gray-400" />
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                type="number"
                step="any"
                placeholder="Novo valor"
                className="w-28 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:border-emerald-500"
              />
              <button
                disabled={busy || value === ''}
                onClick={async () => {
                  const ok = await call(
                    `/api/goals/${goal.id}`,
                    { method: 'PATCH', body: JSON.stringify({ currentValue: Number(value) }) },
                    goal.id
                  )
                  if (ok) setValue('')
                }}
                className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40"
              >
                Atualizar
              </button>
            </div>
          )}

          <button
            disabled={busy}
            onClick={() =>
              call(`/api/goals/${goal.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ACHIEVED' }) }, goal.id)
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-500 px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-40"
          >
            <Check size={13} /> Concluir
          </button>

          <button
            disabled={busy}
            onClick={() =>
              call(`/api/goals/${goal.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ABANDONED' }) }, goal.id)
            }
            className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            Abandonar
          </button>

          {goal.isMine && (
            <button
              disabled={busy}
              onClick={() => call(`/api/goals/${goal.id}`, { method: 'DELETE' }, goal.id)}
              className="inline-flex items-center gap-1 text-xs font-medium text-red-500 border border-red-100 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <Trash2 size={13} /> Apagar
            </button>
          )}
        </div>
      ) : (
        <button
          disabled={busy}
          onClick={() =>
            call(`/api/goals/${goal.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'ACTIVE' }) }, goal.id)
          }
          className="mt-4 text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          Reabrir
        </button>
      )}
    </div>
  )
}
