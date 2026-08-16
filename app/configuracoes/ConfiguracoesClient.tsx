'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Bell, CreditCard, Calendar, CheckCircle } from 'lucide-react'

const tabs = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'disponibilidade', label: 'Disponibilidade', icon: Calendar },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
]

const WEEKDAY_LABELS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const SLOT_DURATIONS = [15, 30, 45, 50, 60, 90]

export interface AvailabilityData {
  slotMinutes: number
  days: { weekday: number; startTime: string; endTime: string }[]
}

const SPECIALTIES = [
  'Nutrição Esportiva',
  'Nutrição Clínica',
  'Nutrição Funcional',
  'Nutrição Infantil',
  'Nutrição Vegana',
  'Nutrição Oncológica',
]

export interface ProfileData {
  name: string
  crn: string
  email: string
  phone: string
  specialty: string
  city: string
  price: number
  bio: string
  initials: string
}

export default function ConfiguracoesClient({
  initialProfile,
  initialAvailability,
}: {
  initialProfile: ProfileData
  initialAvailability: AvailabilityData
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('perfil')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(initialProfile.name)
  const [crn, setCrn] = useState(initialProfile.crn)
  const [phone, setPhone] = useState(initialProfile.phone)
  const [specialty, setSpecialty] = useState(initialProfile.specialty)
  const [city, setCity] = useState(initialProfile.city)
  const [price, setPrice] = useState(String(initialProfile.price))
  const [bio, setBio] = useState(initialProfile.bio)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/professional/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, crn, phone, specialty, city, price: Number(price), bio }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível salvar')
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const [slotMinutes, setSlotMinutes] = useState(initialAvailability.slotMinutes)
  const [availDays, setAvailDays] = useState(() => {
    const byWeekday = new Map(initialAvailability.days.map((d) => [d.weekday, d]))
    return Array.from({ length: 7 }, (_, weekday) => {
      const existing = byWeekday.get(weekday)
      return {
        weekday,
        enabled: Boolean(existing),
        startTime: existing?.startTime ?? '09:00',
        endTime: existing?.endTime ?? '17:00',
      }
    })
  })
  const [availError, setAvailError] = useState<string | null>(null)
  const [availSaved, setAvailSaved] = useState(false)
  const [availLoading, setAvailLoading] = useState(false)

  function updateDay(weekday: number, patch: Partial<(typeof availDays)[number]>) {
    setAvailDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
  }

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault()
    setAvailError(null)
    const enabledDays = availDays.filter((d) => d.enabled)
    if (enabledDays.length === 0) {
      setAvailError('Selecione ao menos um dia de atendimento')
      return
    }
    for (const d of enabledDays) {
      if (d.startTime >= d.endTime) {
        setAvailError(`${WEEKDAY_LABELS[d.weekday]}: horário de início deve ser antes do término`)
        return
      }
    }
    setAvailLoading(true)
    try {
      const res = await fetch('/api/professional/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotMinutes,
          days: enabledDays.map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAvailError(data.error ?? 'Não foi possível salvar')
        return
      }
      setAvailSaved(true)
      router.refresh()
      setTimeout(() => setAvailSaved(false), 2500)
    } catch {
      setAvailError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setAvailLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-8 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Informações pessoais</h2>

            <div className="flex items-center gap-5 mb-6">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {initialProfile.initials}
              </div>
              <div>
                <button type="button" className="text-sm font-medium text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
                  Alterar foto
                </button>
                <p className="text-xs text-gray-400 mt-1.5">JPG ou PNG. Máximo 2MB.</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{error}</div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome completo</label>
                <input value={name} onChange={(e) => setName(e.target.value)} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">CRN</label>
                <input value={crn} onChange={(e) => setCrn(e.target.value)} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
                <input value={initialProfile.email} disabled type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-500 cursor-not-allowed" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Telefone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Especialidade</label>
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                  {SPECIALTIES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor por consulta (R$)</label>
                <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                <p className="text-xs text-gray-400 mt-1.5">Esse é o valor que aparece na busca, no seu perfil e no agendamento.</p>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Bio profissional</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              {saved && <><CheckCircle size={16} /> Salvo com sucesso!</>}
            </div>
            <button type="submit" disabled={loading} className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'disponibilidade' && (
        <form onSubmit={handleSaveAvailability} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-1">Horários de atendimento</h2>
            <p className="text-sm text-gray-500 mb-5">
              Defina os dias e horários em que você atende. Pacientes só conseguem agendar dentro desses horários.
            </p>

            {availError && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{availError}</div>
            )}

            <div className="mb-5">
              <label className="text-xs font-bold text-gray-700 block mb-1.5">Duração da consulta</label>
              <select
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(Number(e.target.value))}
                className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white"
              >
                {SLOT_DURATIONS.map((m) => (
                  <option key={m} value={m}>{m} minutos</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              {availDays.map((d) => (
                <div
                  key={d.weekday}
                  className={`flex flex-wrap items-center gap-4 p-3 rounded-xl border ${
                    d.enabled ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100'
                  }`}
                >
                  <label className="flex items-center gap-2.5 w-40 shrink-0 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateDay(d.weekday, { enabled: e.target.checked })}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-900">{WEEKDAY_LABELS[d.weekday]}</span>
                  </label>
                  {d.enabled ? (
                    <div className="flex items-center gap-2 text-sm">
                      <input
                        type="time"
                        value={d.startTime}
                        onChange={(e) => updateDay(d.weekday, { startTime: e.target.value })}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-gray-400">até</span>
                      <input
                        type="time"
                        value={d.endTime}
                        onChange={(e) => updateDay(d.weekday, { endTime: e.target.value })}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Não atende</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
              {availSaved && <><CheckCircle size={16} /> Salvo com sucesso!</>}
            </div>
            <button type="submit" disabled={availLoading} className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60">
              {availLoading ? 'Salvando...' : 'Salvar horários'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'seguranca' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900 mb-5">Alterar senha</h2>
          {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map((label) => (
            <div key={label}>
              <label className="text-xs font-bold text-gray-700 block mb-1.5">{label}</label>
              <input type="password" placeholder="••••••••" disabled className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
            </div>
          ))}
          <p className="text-xs text-gray-400">Em breve.</p>
        </div>
      )}

      {activeTab === 'notificacoes' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Preferências de notificação</h2>
          {[
            { label: 'Novo agendamento', desc: 'Quando um paciente agenda uma consulta' },
            { label: 'Cancelamento', desc: 'Quando uma consulta é cancelada' },
            { label: 'Lembrete 1h antes', desc: 'Aviso antes de cada consulta' },
            { label: 'Avaliações', desc: 'Quando receber uma nova avaliação' },
            { label: 'Novidades da plataforma', desc: 'Atualizações e melhorias do NutriMatch' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pagamentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">Métodos de recebimento</h2>
          <div className="space-y-3">
            {[
              { type: 'PIX', detail: '***. 456.789-00', active: true },
              { type: 'Conta bancária', detail: 'Itaú · Ag 1234 · CC 56789-0', active: true },
            ].map((m) => (
              <div key={m.type} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.type}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{m.detail}</p>
                </div>
                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full">Ativo</span>
              </div>
            ))}
            <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors font-medium">
              + Adicionar método
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
