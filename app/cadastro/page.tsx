'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Stethoscope, Check } from 'lucide-react'

type Role = 'PATIENT' | 'PROFESSIONAL'

export default function Cadastro() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('PATIENT')
  const [step, setStep] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [birthDate, setBirthDate] = useState('')
  const [goal, setGoal] = useState('Emagrecimento')
  const [patientCity, setPatientCity] = useState('')

  const [crn, setCrn] = useState('')
  const [specialty, setSpecialty] = useState('Nutrição Esportiva')
  const [price, setPrice] = useState('150')
  const [modality, setModality] = useState<'AMBOS' | 'ONLINE' | 'PRESENCIAL'>('AMBOS')
  const [professionalCity, setProfessionalCity] = useState('')

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const body =
        role === 'PATIENT'
          ? { role, name, email, password, birthDate: birthDate || undefined, goal, city: patientCity }
          : { role, name, email, password, crn, specialty, city: professionalCity, price: Number(price), modality }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível criar sua conta')
        return
      }
      router.push(data.role === 'PROFESSIONAL' ? '/dashboard' : '/patient/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex w-1/2 bg-emerald-500 flex-col justify-between p-12">
        <Link href="/" className="text-2xl font-bold text-white">
          Nutri<span className="text-emerald-200">Match</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Comece sua jornada para uma vida mais saudável
          </h2>
          <p className="text-emerald-100 text-lg mb-8">
            Crie sua conta em poucos minutos e encontre o nutricionista perfeito para você.
          </p>
          <div className="space-y-3">
            {['Sem taxa de cadastro', 'Agende quando quiser', 'Atendimento online e presencial'].map((item) => (
              <div key={item} className="flex items-center gap-3 text-emerald-100">
                <div className="w-5 h-5 bg-emerald-400 rounded-full flex items-center justify-center shrink-0">
                  <Check size={11} className="text-white" />
                </div>
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-emerald-200 text-sm">© 2026 NutriMatch</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors">
            <ArrowLeft size={16} /> Já tenho conta
          </Link>

          {/* Progresso */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map((s) => (
              <React.Fragment key={s}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s ? 'bg-emerald-500 text-white' : step === s ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > s ? <Check size={12} /> : s}
                </div>
                {s < 2 && <div className={`flex-1 h-1 rounded-full transition-colors ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
              </React.Fragment>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {step === 1 ? 'Criar conta' : 'Completar perfil'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {step === 1 ? 'Escolha como deseja usar a plataforma' : 'Mais alguns dados para finalizar'}
          </p>

          {step === 1 && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {([['PATIENT', 'Paciente', User, 'Quero encontrar um nutricionista'], ['PROFESSIONAL', 'Profissional', Stethoscope, 'Quero atender pacientes']] as const).map(
                  ([r, label, Icon, desc]) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`border-2 rounded-2xl p-4 text-center transition-all ${
                        role === r ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={28} className={`mx-auto mb-2 ${role === r ? 'text-emerald-500' : 'text-gray-400'}`} />
                      <p className="font-bold text-sm text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-1">{desc}</p>
                    </button>
                  )
                )}
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors">
                  Continuar
                </button>
              </form>
            </>
          )}

          {step === 2 && (
            <form onSubmit={handleStep2} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              {role === 'PROFESSIONAL' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">CRN (Conselho Regional de Nutrição)</label>
                    <input
                      type="text"
                      value={crn}
                      onChange={(e) => setCrn(e.target.value)}
                      placeholder="Ex: CRN-3 · 12.345"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Especialidade principal</label>
                    <select
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option>Nutrição Esportiva</option>
                      <option>Nutrição Clínica</option>
                      <option>Nutrição Funcional</option>
                      <option>Nutrição Infantil</option>
                      <option>Nutrição Vegana</option>
                      <option>Nutrição Oncológica</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
                    <input
                      type="text"
                      value={professionalCity}
                      onChange={(e) => setProfessionalCity(e.target.value)}
                      placeholder="São Paulo, SP"
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor por consulta (R$)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      min={50}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Modalidade de atendimento</label>
                    <select
                      value={modality}
                      onChange={(e) => setModality(e.target.value as typeof modality)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option value="AMBOS">Online e Presencial</option>
                      <option value="ONLINE">Apenas Online</option>
                      <option value="PRESENCIAL">Apenas Presencial</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400">
                    Seu perfil ficará em análise até ser aprovado pela nossa equipe e não aparecerá nas buscas até lá.
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Data de nascimento</label>
                    <input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Objetivo principal</label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white"
                    >
                      <option>Emagrecimento</option>
                      <option>Ganho de massa muscular</option>
                      <option>Melhora da saúde geral</option>
                      <option>Controle de doenças</option>
                      <option>Nutrição esportiva</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Cidade</label>
                    <input
                      type="text"
                      value={patientCity}
                      onChange={(e) => setPatientCity(e.target.value)}
                      placeholder="São Paulo, SP"
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-white"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl hover:bg-gray-50 transition-colors">
                  Voltar
                </button>
                <button type="submit" disabled={loading} className="flex-1 bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-60">
                  {loading ? 'Criando...' : 'Criar conta'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            Ao criar sua conta, você concorda com nossos{' '}
            <span className="text-emerald-600 cursor-pointer hover:underline">Termos de Uso</span> e{' '}
            <span className="text-emerald-600 cursor-pointer hover:underline">Política de Privacidade</span>
          </p>
        </div>
      </div>
    </div>
  )
}
