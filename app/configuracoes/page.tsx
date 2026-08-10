'use client'

import React, { useState } from 'react'
import { User, Lock, Bell, CreditCard, CheckCircle } from 'lucide-react'
import ProfessionalSidebar from '../components/ProfessionalSidebar'

const tabs = [
  { id: 'perfil', label: 'Perfil', icon: User },
  { id: 'seguranca', label: 'Segurança', icon: Lock },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'pagamentos', label: 'Pagamentos', icon: CreditCard },
]

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState('perfil')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <ProfessionalSidebar />

      <main className="flex-1 overflow-auto">
        <div className="bg-white border-b border-gray-100 px-8 py-5">
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gerencie seu perfil e preferências</p>
        </div>

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
                    CM
                  </div>
                  <div>
                    <button type="button" className="text-sm font-medium text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
                      Alterar foto
                    </button>
                    <p className="text-xs text-gray-400 mt-1.5">JPG ou PNG. Máximo 2MB.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Nome completo</label>
                    <input defaultValue="Carolina Matos" type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">CRN</label>
                    <input defaultValue="CRN-3 · 12.345" type="text" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">E-mail</label>
                    <input defaultValue="carolina@nutrimatch.com.br" type="email" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Telefone</label>
                    <input defaultValue="(11) 99999-9999" type="tel" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Especialidade</label>
                    <select defaultValue="Nutrição Esportiva" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                      <option>Nutrição Esportiva</option>
                      <option>Nutrição Clínica</option>
                      <option>Nutrição Funcional</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">Valor por consulta (R$)</label>
                    <input defaultValue="150" type="number" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">Bio profissional</label>
                  <textarea
                    defaultValue="Especialista em nutrição esportiva e funcional com mais de 8 anos de experiência."
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  {saved && <><CheckCircle size={16} /> Salvo com sucesso!</>}
                </div>
                <button type="submit" className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                  Salvar alterações
                </button>
              </div>
            </form>
          )}

          {activeTab === 'seguranca' && (
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-base font-bold text-gray-900 mb-5">Alterar senha</h2>
              {['Senha atual', 'Nova senha', 'Confirmar nova senha'].map((label) => (
                <div key={label}>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">{label}</label>
                  <input type="password" placeholder="••••••••" className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                </div>
              ))}
              <div className="pt-2">
                <button type="submit" className="bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                  Atualizar senha
                </button>
              </div>
            </form>
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
      </main>
    </div>
  )
}
