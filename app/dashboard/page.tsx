'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Calendar, Users, Settings, Bell, Clock } from 'lucide-react';

export default function DashboardProfissional() {
  return (
    <div className="bg-gray-50 min-h-screen font-sans pb-24 max-w-md mx-auto shadow-xl relative overflow-hidden">
      <header className="flex justify-between items-center p-6 bg-emerald-500 text-white rounded-b-[30px] shadow-sm pb-10">
        <div>
          <h1 className="text-2xl font-bold">Olá, Carolina!</h1>
          <p className="text-emerald-100 text-sm mt-1">Sua agenda de hoje</p>
        </div>
        <button className="p-2 rounded-full bg-emerald-400/50 relative">
          <Bell size={20} className="text-white" />
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-400 border-2 border-emerald-500 rounded-full"></span>
        </button>
      </header>

      <div className="px-6 -mt-6">
        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">Consultas hoje</p>
            <p className="text-2xl font-bold text-gray-900">4</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
            <Calendar size={24} />
          </div>
        </div>
      </div>

      <div className="px-6 pt-6">
        <h2 className="text-xs font-bold text-gray-500 tracking-widest mb-4 uppercase">Próximos Pacientes</h2>
        
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-emerald-500">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Ana Silva</h3>
                <p className="text-xs text-gray-500 mt-0.5">Retorno - Plano Esportivo</p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-xs font-bold">
                <Clock size={12} /> 14:30
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 border-l-4 border-l-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Carlos Mendes</h3>
                <p className="text-xs text-gray-500 mt-0.5">Primeira Consulta</p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-bold">
                <Clock size={12} /> 16:00
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-gray-100 flex justify-around items-center py-4 px-6 z-20">
        <Link href="/" className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-500">
          <Home size={22} />
          <span className="text-[10px] font-medium">Início</span>
        </Link>
        <button className="flex flex-col items-center gap-1 text-emerald-500">
          <Calendar size={22} className="fill-emerald-100" />
          <span className="text-[10px] font-bold">Agenda</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-500">
          <Users size={22} />
          <span className="text-[10px] font-medium">Pacientes</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-emerald-500">
          <Settings size={22} />
          <span className="text-[10px] font-medium">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}