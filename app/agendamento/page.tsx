'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar as CalendarIcon, Clock } from 'lucide-react';

export default function Agendamento() {
  const router = useRouter();

  return (
    <div className="bg-white min-h-screen font-sans pb-24 max-w-md mx-auto shadow-xl relative overflow-hidden">
      <header className="flex items-center gap-4 p-6 border-b border-gray-100">
        <button onClick={() => router.back()} className="text-gray-900">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Agendar Consulta</h1>
      </header>

      <div className="p-6 flex items-center gap-4 bg-gray-50">
        <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold">CM</div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">Dra. Carolina Matos</h3>
          <p className="text-xs text-gray-500">Nutrição Esportiva</p>
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarIcon size={18} className="text-emerald-500" /> Outubro 2026
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {['Seg 12', 'Ter 13', 'Qua 14', 'Qui 15'].map((dia, index) => (
            <button key={index} className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border ${index === 2 ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}>
              <span className="text-xs font-medium">{dia.split(' ')[0]}</span>
              <span className="text-lg font-bold">{dia.split(' ')[1]}</span>
            </button>
          ))}
        </div>

        <h2 className="text-sm font-bold text-gray-900 mt-6 mb-4 flex items-center gap-2">
          <Clock size={18} className="text-emerald-500" /> Horários
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {['09:00', '10:00', '14:30', '15:30', '16:00', '17:30'].map((hora, index) => (
            <button key={index} className={`py-3 rounded-xl border text-sm font-bold ${index === 2 ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-gray-200 text-gray-600'}`}>
              {hora}
            </button>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 max-w-md w-full bg-white p-4 border-t border-gray-100 z-20">
        <Link href="/dashboard" className="w-full block text-center bg-emerald-500 text-white rounded-2xl py-4 px-6 text-base font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600">
          Confirmar Agendamento
        </Link>
      </div>
    </div>
  );
}