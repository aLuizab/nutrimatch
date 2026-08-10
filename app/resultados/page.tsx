'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Star, X, MapPin, Video, Users } from 'lucide-react'
import PublicHeader from '../components/PublicHeader'

const allNutritionists = [
  { id: 1, name: 'Dra. Carolina Matos', specialty: 'Nutrição Esportiva', rating: 4.9, reviews: 47, price: 150, modality: 'Online e Presencial', city: 'São Paulo', initials: 'CM', color: 'bg-emerald-500' },
  { id: 2, name: 'Dr. Rafael Costa', specialty: 'Nutrição Clínica', rating: 4.8, reviews: 62, price: 120, modality: 'Online', city: 'Rio de Janeiro', initials: 'RC', color: 'bg-blue-500' },
  { id: 3, name: 'Dra. Maria Fernanda', specialty: 'Nutrição Funcional', rating: 5.0, reviews: 31, price: 180, modality: 'Presencial', city: 'São Paulo', initials: 'MF', color: 'bg-purple-500' },
  { id: 4, name: 'Dra. Juliana Torres', specialty: 'Nutrição Infantil', rating: 4.7, reviews: 58, price: 130, modality: 'Online e Presencial', city: 'Belo Horizonte', initials: 'JT', color: 'bg-pink-500' },
  { id: 5, name: 'Dr. André Lima', specialty: 'Nutrição Esportiva', rating: 4.9, reviews: 44, price: 140, modality: 'Online', city: 'Curitiba', initials: 'AL', color: 'bg-orange-500' },
  { id: 6, name: 'Dra. Beatriz Oliveira', specialty: 'Nutrição Vegana', rating: 4.8, reviews: 29, price: 110, modality: 'Online e Presencial', city: 'São Paulo', initials: 'BO', color: 'bg-green-500' },
  { id: 7, name: 'Dr. Lucas Ferreira', specialty: 'Nutrição Clínica', rating: 4.6, reviews: 38, price: 100, modality: 'Presencial', city: 'Porto Alegre', initials: 'LF', color: 'bg-teal-500' },
  { id: 8, name: 'Dra. Amanda Santos', specialty: 'Nutrição Oncológica', rating: 4.9, reviews: 25, price: 200, modality: 'Online e Presencial', city: 'São Paulo', initials: 'AS', color: 'bg-red-500' },
]

const specialties = ['Todas', 'Esportiva', 'Clínica', 'Funcional', 'Infantil', 'Vegana', 'Oncológica']

export default function Resultados() {
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('Todas')
  const [modality, setModality] = useState('Todas')
  const [maxPrice, setMaxPrice] = useState(250)
  const [sortBy, setSortBy] = useState('rating')

  const filtered = allNutritionists
    .filter((n) => {
      const matchSearch =
        n.name.toLowerCase().includes(search.toLowerCase()) ||
        n.specialty.toLowerCase().includes(search.toLowerCase()) ||
        n.city.toLowerCase().includes(search.toLowerCase())
      const matchSpecialty = specialty === 'Todas' || n.specialty.includes(specialty)
      const matchModality = modality === 'Todas' || n.modality.includes(modality)
      const matchPrice = n.price <= maxPrice
      return matchSearch && matchSpecialty && matchModality && matchPrice
    })
    .sort((a, b) => (sortBy === 'rating' ? b.rating - a.rating : a.price - b.price))

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Barra de busca */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, especialidade ou cidade..."
              className="w-full border border-gray-200 rounded-xl py-3 pl-11 pr-10 text-sm bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="rating">Melhor avaliação</option>
            <option value="price">Menor preço</option>
          </select>
        </div>

        <div className="flex gap-6">
          {/* Filtros laterais */}
          <aside className="w-64 shrink-0 hidden md:block space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Especialidade</h3>
                <div className="space-y-0.5">
                  {specialties.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpecialty(s)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                        specialty === s ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Modalidade</h3>
                <div className="space-y-0.5">
                  {['Todas', 'Online', 'Presencial'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setModality(m)}
                      className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                        modality === m ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                  Preço máximo:{' '}
                  <span className="text-emerald-600 normal-case font-bold">R$ {maxPrice}</span>
                </h3>
                <input
                  type="range"
                  min={50}
                  max={250}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>R$ 50</span>
                  <span>R$ 250</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Resultados */}
          <div className="flex-1">
            <p className="text-sm text-gray-500 mb-4">
              <span className="font-bold text-gray-900">{filtered.length}</span>{' '}
              profissional{filtered.length !== 1 ? 'is' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-4">
              {filtered.map((n) => (
                <div key={n.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${n.color} text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0`}>
                      {n.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <h3 className="font-bold text-gray-900">{n.name}</h3>
                          <p className="text-sm text-gray-500">{n.specialty}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <Star size={13} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-gray-700">{n.rating}</span>
                              <span className="text-xs text-gray-400">({n.reviews})</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin size={12} /> {n.city}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              {n.modality.includes('Online') ? <Video size={12} /> : <Users size={12} />}
                              {n.modality}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">R$ {n.price}</p>
                            <p className="text-xs text-gray-400">/consulta</p>
                          </div>
                          <Link
                            href="/perfil"
                            className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-600 transition-colors"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filtered.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-gray-400 text-lg font-medium">Nenhum profissional encontrado</p>
                  <p className="text-gray-400 text-sm mt-2">Tente ajustar os filtros de busca</p>
                  <button
                    onClick={() => { setSearch(''); setSpecialty('Todas'); setModality('Todas'); setMaxPrice(250) }}
                    className="mt-4 text-emerald-600 text-sm font-medium hover:underline"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
