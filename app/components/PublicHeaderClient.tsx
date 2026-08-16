'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogIn, UserPlus, Menu, X, LayoutDashboard, LogOut } from 'lucide-react'
import { useState } from 'react'
import type { Role } from '@/lib/jwt'

const ROLE_HOME: Record<Role, string> = {
  PROFESSIONAL: '/dashboard',
  PATIENT: '/patient/dashboard',
  ADMIN: '/admin/dashboard',
}

export interface AuthState {
  name: string
  role: Role
}

export default function PublicHeaderClient({ authState }: { authState: AuthState | null }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    setMobileOpen(false)
    router.push('/')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-2xl font-bold text-gray-900">
            Nutri<span className="text-emerald-500">Match</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-emerald-600 transition-colors">Início</Link>
            <Link href="/resultados" className="hover:text-emerald-600 transition-colors">Especialistas</Link>
            <Link href="/#como-funciona" className="hover:text-emerald-600 transition-colors">Como funciona</Link>
          </nav>
        </div>
        <div className="hidden md:flex items-center gap-3">
          {authState ? (
            <>
              <Link
                href={ROLE_HOME[authState.role]}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <LayoutDashboard size={16} /> {authState.name.split(' ')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-medium text-red-500 px-4 py-2 rounded-xl hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} /> Sair
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-2 text-sm font-medium text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-colors">
                <LogIn size={16} /> Entrar
              </Link>
              <Link href="/cadastro" className="flex items-center gap-2 bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors">
                <UserPlus size={16} /> Cadastrar
              </Link>
            </>
          )}
        </div>
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
          <Link href="/" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>Início</Link>
          <Link href="/resultados" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileOpen(false)}>Especialistas</Link>
          {authState ? (
            <div className="flex gap-3 pt-2">
              <Link href={ROLE_HOME[authState.role]} className="flex-1 text-center border border-gray-200 text-sm font-medium py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>
                Minha conta
              </Link>
              <button onClick={handleLogout} className="flex-1 text-center bg-red-50 text-red-500 text-sm font-bold py-2.5 rounded-xl">
                Sair
              </button>
            </div>
          ) : (
            <div className="flex gap-3 pt-2">
              <Link href="/login" className="flex-1 text-center border border-gray-200 text-sm font-medium py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>Entrar</Link>
              <Link href="/cadastro" className="flex-1 text-center bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl" onClick={() => setMobileOpen(false)}>Cadastrar</Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
