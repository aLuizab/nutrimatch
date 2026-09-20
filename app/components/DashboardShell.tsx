'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import LogoutButton from './LogoutButton'

// Shared frame for every authenticated page: fixed sidebar on md+, top bar + slide-over
// drawer below. Takes the sidebar as a ReactNode slot (not a config object) because nav
// icons are component references, which can't cross the RSC serialization boundary.
export default function DashboardShell({ sidebar, children }: { sidebar: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="md:hidden sticky top-0 z-30 bg-surface border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-gray-900">
          Nutri<span className="text-emerald-500">Match</span>
        </Link>
        <div className="flex items-center gap-1">
          <LogoutButton iconOnly className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors" />
          <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <Menu size={22} className="text-gray-700" />
          </button>
        </div>
      </div>

      <div className="flex min-h-screen">
        <div className="hidden md:block">{sidebar}</div>
        <main className="flex-1 overflow-auto min-w-0">{children}</main>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          {/* Any click inside (including nav links) closes the drawer. */}
          <div className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl overflow-y-auto" onClick={() => setOpen(false)}>
            {sidebar}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar menu"
            className="absolute top-3 left-[17rem] p-2 bg-surface rounded-full shadow"
          >
            <X size={18} className="text-gray-700" />
          </button>
        </div>
      )}
    </div>
  )
}
