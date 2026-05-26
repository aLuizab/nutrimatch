'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, UserCircle } from 'lucide-react';

export default function LoginProfissional() {
  const router = useRouter();

  return (
    <div className="bg-white min-h-screen font-sans max-w-md mx-auto shadow-xl relative flex flex-col">
      <header className="p-6">
        <button onClick={() => router.back()} className="text-gray-900">
          <ArrowLeft size={24} />
        </button>
      </header>

      <div className="px-6 flex-1 flex flex-col justify-center pb-20">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
          <UserCircle size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">Área do Profissional</h1>
        <p className="text-sm text-gray-500 mt-2 mb-8">Faça login para gerenciar sua agenda e pacientes.</p>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          
          <div className="text-right pb-4">
            <button type="button" className="text-xs text-emerald-600 font-bold hover:underline">Esqueci minha senha</button>
          </div>

          {/* Botão que leva direto para o Dashboard do profissional */}
          <Link href="/dashboard" className="w-full block text-center bg-emerald-500 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-600 transition-colors">
            Entrar
          </Link>
        </form>
      </div>
    </div>
  );
}