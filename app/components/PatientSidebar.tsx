'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Calendar, User, TrendingUp, Target, ArrowLeft } from 'lucide-react'
import { initials } from '@/lib/format'
import LogoutButton from './LogoutButton'
import type { Role } from '@/lib/jwt'

const navItems = [
  { href: '/patient/dashboard', label: 'Início', icon: LayoutDashboard },
  { href: '/patient/consultas', label: 'Minhas Consultas', icon: Calendar },
  { href: '/patient/evolucao', label: 'Minha Evolução', icon: TrendingUp },
  { href: '/patient/metas', label: 'Minhas Metas', icon: Target },
  { href: '/patient/perfil', label: 'Meu Perfil', icon: User },
]

// Para onde volta quem está aqui só como paciente "de passagem". Um nutricionista que se
// consulta pela plataforma continua sendo nutricionista — sem esta volta, entrar na área do
// paciente vira um beco sem saída até ele reparar na logo do topo.
const WORKSPACE_HOME: Partial<Record<Role, { href: string; label: string }>> = {
  PROFESSIONAL: { href: '/dashboard', label: 'Voltar ao painel profissional' },
  ADMIN: { href: '/admin/dashboard', label: 'Voltar ao painel do admin' },
}

export default function PatientSidebar({
  name = 'Ana Silva',
  primaryRole = 'PATIENT',
}: { name?: string; primaryRole?: Role } = {}) {
  const pathname = usePathname()
  const workspace = WORKSPACE_HOME[primaryRole]

  return (
    <aside className="w-64 bg-white border-r border-gray-100 min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-100">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Nutri<span className="text-emerald-500">Match</span>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm shrink-0">
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
            <p className="text-xs text-gray-500">Paciente</p>
          </div>
        </div>
      </div>

      {workspace && (
        <div className="px-4 pt-3">
          <Link
            href={workspace.href}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={14} /> {workspace.label}
          </Link>
        </div>
      )}

      <nav className="flex-1 p-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <LogoutButton className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-colors" />
      </div>
    </aside>
  )
}
