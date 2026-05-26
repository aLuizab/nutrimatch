'use client';

import React from 'react';
import Link from 'next/link';
import { Search, SlidersHorizontal, MapPin, Star, Calendar, User, LogIn } from 'lucide-react';

export default function TelaBuscaPaciente() {
  return (
    // Removi o "max-w-md mx-auto". Agora o fundo ocupa a tela toda.
    <div className="bg-gray-50 min-h-screen font-sans pb-24 md:pb-0 relative">
      
      {/* HEADER RESPONSIVO: Navbar tradicional no PC, condensado no celular */}
      <header className="bg-white shadow-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">
              Nutri<span className="text-emerald-500">Match</span>
            </h1>
            
            {/* Links Desktop (Invisíveis no celular, flex no PC) */}
            <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
              <Link href="/" className="text-emerald-500 font-bold">Início</Link>
              <Link href="#" className="hover:text-emerald-500 transition-colors">Especialistas</Link>
              <Link href="#" className="hover:text-emerald-500 transition-colors">Minhas Consultas</Link>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Botão de Login Desktop */}
            <Link href="/login" className="hidden md:flex items-center gap-2 text-emerald-600 bg-emerald-50 px-5 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm font-bold text-sm">
              <LogIn size={18} />
              Sou Profissional
            </Link>
            
            {/* Botão de Login Mobile */}
            <Link href="/login" className="md:hidden flex flex-col items-center justify-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
              <LogIn size={20} />
              <span className="text-[10px] font-bold text-center leading-none">Sou<br/>Profissional</span>
            </Link>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (Centralizado com limite largo no PC) */}
      <main className="max-w-7xl mx-auto px-6 mt-8 md:mt-12">
        
        {/* Seção Hero e Busca: Fica lado a lado com o mapa no PC */}
        <div className="flex flex-col md:flex-row gap-8 md:gap-16 items-center md:items-start mb-12">
          
          <div className="w-full md:w-1/2 space-y-6">
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
              Encontre o seu <br className="hidden md:block"/><span className="text-emerald-500">Nutricionista</span>
            </h2>
            <p className="text-base md:text-lg text-gray-500">Busque por especialistas e agende consultas sem precisar de cadastro prévio.</p>
            
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Nome, região, especialidade..."
                    className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-gray-700 shadow-sm focus:outline-none focus:border-emerald-500 transition-all text-sm md:text-base"
                  />
                </div>
                <button className="bg-emerald-500 text-white p-3.5 rounded-2xl shadow-sm hover:bg-emerald-600 transition-colors flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={20} />
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                <button className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-1.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap">Todas especialidades</button>
                <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap hover:bg-gray-50">Até R$ 150</button>
                <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs md:text-sm font-medium whitespace-nowrap hover:bg-gray-50">Online</button>
              </div>
            </div>
          </div>

          {/* Mapa Genérico (Aumenta a altura no PC) */}
          <div className="w-full md:w-1/2">
            <div className="bg-[#E8F3F0] rounded-3xl h-40 md:h-80 w-full relative border border-emerald-100 overflow-hidden flex items-center justify-center shadow-inner">
                <div className="absolute inset-0 opacity-40 flex flex-col justify-evenly">
                    <div className="h-4 w-full bg-white"></div>
                    <div className="h-4 md:h-6 w-full bg-white"></div>
                    <div className="h-4 hidden md:block w-full bg-white"></div>
                </div>
                <div className="absolute top-1/4 left-1/4 w-8 h-8 md:w-12 md:h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
                  <MapPin size={18} className="md:w-6 md:h-6" />
                </div>
                <div className="absolute bottom-1/3 right-1/3 w-8 h-8 md:w-10 md:h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
                  <MapPin size={14} className="md:w-5 md:h-5" />
                </div>
            </div>
          </div>

        </div>

        {/* Resultados da Busca (Grade Responsiva) */}
        <div>
          <h2 className="text-xs md:text-sm font-bold text-gray-500 tracking-widest mb-6 uppercase">Recomendados</h2>
          
          {/* GRID: 1 coluna no celular, 2 no tablet, 3 no PC grande */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Card 1 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">Profissional Especialista</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Nutrição Esportiva</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 font-medium">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span>4.9</span><span className="mx-0.5">•</span><span>Online e Presencial</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="text-sm font-bold text-gray-900">R$ 120 <span className="text-[10px] text-gray-500 font-normal">/consulta</span></div>
                <Link href="/perfil" className="bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-emerald-600 transition-colors">
                  Ver Perfil
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">Profissional Clínico</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Nutrição Clínica</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 font-medium">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span>4.8</span><span className="mx-0.5">•</span><span>Apenas Online</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="text-sm font-bold text-gray-900">R$ 90 <span className="text-[10px] text-gray-500 font-normal">/consulta</span></div>
                <Link href="/perfil" className="bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-emerald-600 transition-colors">
                  Ver Perfil
                </Link>
              </div>
            </div>

            {/* Card 3 (Visível no PC para completar a grade) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all hidden md:block">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-lg font-bold shrink-0">
                  <User size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-base">Especialista Funcional</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Nutrição Funcional</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500 font-medium">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span>5.0</span><span className="mx-0.5">•</span><span>Presencial</span>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
                <div className="text-sm font-bold text-gray-900">R$ 150 <span className="text-[10px] text-gray-500 font-normal">/consulta</span></div>
                <Link href="/perfil" className="bg-emerald-500 text-white text-xs font-bold px-6 py-2.5 rounded-full hover:bg-emerald-600 transition-colors">
                  Ver Perfil
                </Link>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Menu Inferior do Paciente (INVISÍVEL NO PC, VISÍVEL NO CELULAR) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-100 flex justify-around items-center py-4 px-6 z-20">
        <Link href="/" className="flex flex-col items-center gap-1 text-emerald-500">
          <Search size={22} />
          <span className="text-[10px] font-bold">Buscar</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-500 transition-colors">
          <Calendar size={22} />
          <span className="text-[10px] font-medium">Consultas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-500 transition-colors">
          <User size={22} />
          <span className="text-[10px] font-medium">Perfil</span>
        </button>
      </nav>
    </div>
  );
}