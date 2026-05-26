'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Share, Star, CheckCircle2, ArrowRight } from 'lucide-react';

export default function PerfilProfissional() {
  const router = useRouter();

  return (
    <div className="bg-gray-50 min-h-screen font-sans max-w-md mx-auto shadow-xl relative pb-24">
      <div className="bg-emerald-500 h-48 rounded-b-[40px] px-6 pt-6 relative">
        <div className="flex justify-between items-center text-white">
          <button onClick={() => router.back()} className="p-2 bg-emerald-600/50 rounded-full backdrop-blur-sm">
            <ArrowLeft size={20} />
          </button>
          <button className="p-2 bg-emerald-600/50 rounded-full backdrop-blur-sm">
            <Share size={20} />
          </button>
        </div>
        
        <div className="absolute -bottom-10 left-6 w-24 h-24 bg-emerald-600 text-white border-4 border-gray-50 rounded-full flex items-center justify-center text-3xl font-bold shadow-lg relative">
          CM
          <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5">
            <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-100" />
          </div>
        </div>
      </div>

      <div className="px-6 pt-14 pb-6">
        <h1 className="text-xl font-bold text-gray-900">Dra. Carolina Matos</h1>
        <p className="text-xs text-gray-400 mt-1">CRN-3 • 12.345 • Nutricionista</p>
        
        <div className="flex items-center gap-2 mt-2 text-sm">
          <Star size={16} className="text-yellow-400 fill-yellow-400" />
          <span className="font-bold text-gray-900">4.9</span>
          <span className="text-gray-500 underline">47 avaliações</span>
        </div>
      </div>

      <div className="px-6 pb-6">
        <h2 className="text-xs font-bold text-gray-400 tracking-widest mb-3 uppercase">Sobre</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Especialista em nutrição esportiva e funcional com foco em performance e saúde.
        </p>
      </div>

      <div className="fixed bottom-0 max-w-md w-full bg-white p-4 border-t border-gray-100 z-20">
        <Link href="/agendamento" className="w-full bg-emerald-500 text-white rounded-2xl py-4 px-6 flex items-center justify-between shadow-lg shadow-emerald-200">
          <div className="text-left">
            <span className="block text-[10px] font-medium opacity-80">Consulta individual</span>
            <span className="block text-base font-bold">Agendar — R$150</span>
          </div>
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowRight size={20} />
          </div>
        </Link>
      </div>
    </div>
  );
}