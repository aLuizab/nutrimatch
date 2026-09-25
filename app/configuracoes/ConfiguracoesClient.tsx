'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, Lock, Bell, CreditCard, Calendar, CheckCircle, Plus, X } from 'lucide-react'
import { SPECIALTY_NAMES } from '@/lib/specialties'
import PagamentosTab, { type PixStatus } from './PagamentosTab'
import SegurancaTab from './SegurancaTab'
import DisponibilidadePorData, { type ExcecaoDeData } from './DisponibilidadePorData'
import { ENDERECO_MINIMO, requiresOffice } from '@/lib/office'
import LocationPicker from '../components/LocationPicker'
import PricingGuide from '../components/PricingGuide'
import PhotoUpload from '../components/PhotoUpload'

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

export interface NotificationPrefs {
  notifyBooking: boolean
  notifyCancellation: boolean
  notifyReviews: boolean
}

export interface ProfileData {
  name: string
  crn: string
  email: string
  phone: string
  specialties: string[]
  city: string
  price: number
  bio: string
  modality: 'ONLINE' | 'PRESENCIAL' | 'AMBOS'
  officeAddress: string
  initials: string
  photoUrl: string | null
}

export default function ConfiguracoesClient({
  initialProfile,
  initialAvailability,
  excecoesDeData,
  janelaDeAgenda,
  initialPrefs,
  pix,
  feePercent,
}: {
  initialProfile: ProfileData
  initialAvailability: AvailabilityData
  excecoesDeData: ExcecaoDeData[]
  /** Primeiro e último dia em que marcar consulta faz sentido — ver BOOKING_HORIZON_DAYS. */
  janelaDeAgenda: { primeiroDia: string; ultimoDia: string }
  initialPrefs: NotificationPrefs
  pix: PixStatus
  feePercent: number
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('perfil')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState(initialProfile.name)
  const [crn, setCrn] = useState(initialProfile.crn)
  const [phone, setPhone] = useState(initialProfile.phone)
  const [specialties, setSpecialties] = useState<string[]>(initialProfile.specialties)
  const [city, setCity] = useState(initialProfile.city)
  const [price, setPrice] = useState(String(initialProfile.price))
  const [bio, setBio] = useState(initialProfile.bio)
  const [modality, setModality] = useState(initialProfile.modality)
  const [officeAddress, setOfficeAddress] = useState(initialProfile.officeAddress)

  const precisaEndereco = requiresOffice(modality)
  const enderecoOk = officeAddress.trim().length >= ENDERECO_MINIMO

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => {
      if (prev.includes(s)) return prev.filter((x) => x !== s)
      if (prev.length >= 3) return prev
      return [...prev, s]
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/professional/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          crn,
          phone,
          specialties,
          city,
          price: Number(price),
          bio,
          modality,
          officeAddress: officeAddress.trim() || undefined,
        }),
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
    const byWeekday = new Map<number, { startTime: string; endTime: string }[]>()
    for (const d of initialAvailability.days) {
      const list = byWeekday.get(d.weekday) ?? []
      list.push({ startTime: d.startTime, endTime: d.endTime })
      byWeekday.set(d.weekday, list)
    }
    return Array.from({ length: 7 }, (_, weekday) => {
      const blocks = (byWeekday.get(weekday) ?? []).sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
      return {
        weekday,
        enabled: blocks.length > 0,
        blocks: blocks.length > 0 ? blocks : [{ startTime: '09:00', endTime: '17:00' }],
      }
    })
  })
  const [availError, setAvailError] = useState<string | null>(null)
  const [availSaved, setAvailSaved] = useState(false)
  const [availLoading, setAvailLoading] = useState(false)

  function updateDay(weekday: number, patch: Partial<(typeof availDays)[number]>) {
    setAvailDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)))
  }

  function updateBlock(weekday: number, index: number, patch: Partial<{ startTime: string; endTime: string }>) {
    setAvailDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday
          ? { ...d, blocks: d.blocks.map((b, i) => (i === index ? { ...b, ...patch } : b)) }
          : d
      )
    )
  }

  function addBlock(weekday: number) {
    setAvailDays((prev) =>
      prev.map((d) => {
        if (d.weekday !== weekday || d.blocks.length >= 4) return d
        const last = d.blocks[d.blocks.length - 1]
        const [hh, mm] = last.endTime.split(':').map(Number)
        const start = `${String(Math.min(hh + 1, 21)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
        const end = `${String(Math.min(hh + 3, 23)).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
        return { ...d, blocks: [...d.blocks, { startTime: start, endTime: end }] }
      })
    )
  }

  function removeBlock(weekday: number, index: number) {
    setAvailDays((prev) =>
      prev.map((d) =>
        d.weekday === weekday && d.blocks.length > 1
          ? { ...d, blocks: d.blocks.filter((_, i) => i !== index) }
          : d
      )
    )
  }

  const [prefs, setPrefs] = useState(initialPrefs)
  const [prefsError, setPrefsError] = useState<string | null>(null)

  async function togglePref(key: keyof NotificationPrefs) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setPrefsError(null)
    try {
      const res = await fetch('/api/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: next[key] }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setPrefs(prefs)
      setPrefsError('Não foi possível salvar a preferência. Tente novamente.')
    }
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
      const sorted = [...d.blocks].sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
      for (const b of sorted) {
        if (b.startTime >= b.endTime) {
          setAvailError(`${WEEKDAY_LABELS[d.weekday]}: horário de início deve ser antes do término`)
          return
        }
      }
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].endTime > sorted[i].startTime) {
          setAvailError(`${WEEKDAY_LABELS[d.weekday]}: horários sobrepostos`)
          return
        }
      }
    }
    setAvailLoading(true)
    try {
      const res = await fetch('/api/professional/availability', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotMinutes,
          days: enabledDays.flatMap((d) =>
            d.blocks.map((b) => ({ weekday: d.weekday, startTime: b.startTime, endTime: b.endTime }))
          ),
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
              activeTab === id ? 'bg-surface text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'perfil' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Informações pessoais</h2>

            <div className="mb-6">
              <PhotoUpload
                name={initialProfile.name}
                photoUrl={initialProfile.photoUrl}
              />
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
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
                <LocationPicker value={city} onChange={setCity} required />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Especialidades <span className="font-normal text-gray-400">(até 3)</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {SPECIALTY_NAMES.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 text-sm cursor-pointer select-none transition-colors ${
                        specialties.includes(s)
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-medium'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={specialties.includes(s)}
                        onChange={() => toggleSpecialty(s)}
                        className="rounded accent-emerald-500"
                      />
                      {s.replace('Nutrição ', '')}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor por consulta (R$)</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={1} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  <p className="text-xs text-gray-400 mt-1.5">Esse é o valor que aparece na busca, no seu perfil e no agendamento.</p>
                </div>
                <PricingGuide specialties={specialties} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Modalidade de atendimento
                </label>
                <select
                  value={modality}
                  onChange={(e) => setModality(e.target.value as typeof modality)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-surface focus:outline-none focus:border-emerald-500"
                >
                  <option value="AMBOS">Online e Presencial</option>
                  <option value="ONLINE">Apenas Online</option>
                  <option value="PRESENCIAL">Apenas Presencial</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1.5">
                  Endereço do consultório
                  {!precisaEndereco && <span className="font-normal text-gray-400"> (opcional)</span>}
                </label>
                <input
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="Rua, número, complemento, bairro"
                  maxLength={300}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500"
                />
                {precisaEndereco && !enderecoOk ? (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Sem endereço, o formato presencial não fica disponível para o paciente escolher.
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1.5">
                    É para cá que o paciente vai na consulta presencial. Aparece no seu perfil.
                  </p>
                )}
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
            <button
              type="submit"
              disabled={loading || (precisaEndereco && !enderecoOk)}
              className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'disponibilidade' && (
        <form onSubmit={handleSaveAvailability} className="space-y-6">
          <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6">
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
                className="w-full max-w-xs border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-surface"
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
                  className={`flex flex-wrap items-start gap-4 p-3 rounded-xl border ${
                    d.enabled ? 'border-emerald-100 bg-emerald-50/40' : 'border-gray-100'
                  }`}
                >
                  <label className="flex items-center gap-2.5 w-40 shrink-0 cursor-pointer select-none pt-2">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateDay(d.weekday, { enabled: e.target.checked })}
                      className="rounded accent-emerald-500 w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-900">{WEEKDAY_LABELS[d.weekday]}</span>
                  </label>
                  {d.enabled ? (
                    <div className="space-y-2">
                      {d.blocks.map((b, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <input
                            type="time"
                            value={b.startTime}
                            onChange={(e) => updateBlock(d.weekday, i, { startTime: e.target.value })}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          <span className="text-gray-400">até</span>
                          <input
                            type="time"
                            value={b.endTime}
                            onChange={(e) => updateBlock(d.weekday, i, { endTime: e.target.value })}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                          />
                          {d.blocks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeBlock(d.weekday, i)}
                              aria-label={`Remover horário ${b.startTime}–${b.endTime} de ${WEEKDAY_LABELS[d.weekday]}`}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                      {d.blocks.length < 4 && (
                        <button
                          type="button"
                          onClick={() => addBlock(d.weekday)}
                          className="flex items-center gap-1 text-xs text-emerald-600 font-medium hover:underline"
                        >
                          <Plus size={12} /> Adicionar horário
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic pt-2.5">Não atende</span>
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

      {/* Fora do <form> acima de propósito: as exceções salvam uma data por vez, e um submit da
          grade semanal não pode arrastá-las junto. */}
      {activeTab === 'disponibilidade' && (
        <div className="mt-6">
          <DisponibilidadePorData
            primeiroDia={janelaDeAgenda.primeiroDia}
            ultimoDia={janelaDeAgenda.ultimoDia}
            excecoes={excecoesDeData}
          />
        </div>
      )}

      {activeTab === 'seguranca' && <SegurancaTab />}

      {activeTab === 'notificacoes' && (
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <h2 className="text-base font-bold text-gray-900">Preferências de notificação</h2>
          <p className="text-xs text-gray-500 -mt-3">Notificações são enviadas para {initialProfile.email}.</p>
          {prefsError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-2.5">{prefsError}</div>
          )}
          {(
            [
              { key: 'notifyBooking' as const, label: 'Novo agendamento', desc: 'Quando um paciente agenda uma consulta' },
              { key: 'notifyCancellation' as const, label: 'Cancelamento', desc: 'Quando uma consulta é cancelada' },
              { key: 'notifyReviews' as const, label: 'Avaliações', desc: 'Quando receber uma nova avaliação' },
            ]
          ).map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[item.key]}
                  onChange={() => togglePref(item.key)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:bg-emerald-500 peer-focus:ring-2 peer-focus:ring-emerald-300 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-surface after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>
          ))}
          {[
            { label: 'Lembrete 1h antes', desc: 'Aviso antes de cada consulta' },
            { label: 'Novidades da plataforma', desc: 'Atualizações e melhorias do NutriMatch' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between opacity-50">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc} — Em breve.</p>
              </div>
              <label className="relative inline-flex items-center cursor-not-allowed">
                <input type="checkbox" disabled className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-200 rounded-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-surface after:rounded-full after:h-5 after:w-5" />
              </label>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pagamentos' && (
        <PagamentosTab pix={pix} price={initialProfile.price} feePercent={feePercent} />
      )}
    </div>
  )
}
