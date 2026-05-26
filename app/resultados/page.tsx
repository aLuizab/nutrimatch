'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';

export default function ResultadosBusca() {
  const router = useRouter();

  return (
    <div className="bg-gray-50 min-h-screen font-sans pb-24 max-w-md mx-auto shadow-xl relative overflow-hidden">
      <header className="flex items-center justify-between p-6 bg-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-900">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Nutricionistas</h1>
        </div>
        <span className="text-xs text-gray-500 font-medium">12 encontrados</span>
      </header>

      <div className="px-6 pb-4 flex gap-2 overflow-x-auto no-scrollbar">
        <button className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold">Todos</button>
        <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs font-medium">Online</button>
        <button className="bg-white border border-gray-200 text-gray-600 px-4 py-1.5 rounded-full text-xs font-medium">Esportiva</button>
      </div>

      <div className="px-6 space-y-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex gap-4">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center text-lg font-bold shrink-0">CM</div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 text-sm">Dra. Carolina Matos</h3>
              <p className="text-xs text-gray-500 mt-0.5">Nutrição Esportiva</p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500 font-medium">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span>4.9</span><span className="mx-0.5">•</span><span>47 aval.</span>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-gray-50 pt-4">
            <div className="text-sm font-bold text-gray-900">R$150 <span className="text-[10px] text-gray-500 font-normal">/consulta</span></div>
            <Link href="/perfil" className="bg-emerald-500 text-white text-xs font-bold px-6 py-2 rounded-full hover:bg-emerald-600">
              Agendar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}