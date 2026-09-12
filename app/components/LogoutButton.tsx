'use client'

import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function LogoutButton({
  className,
  iconOnly = false,
  size = 18,
  onClick,
}: {
  className?: string
  iconOnly?: boolean
  size?: number
  onClick?: () => void
}) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    onClick?.()
    router.push('/')
    router.refresh()
  }

  return (
    <button onClick={handleLogout} aria-label="Sair da conta" className={className}>
      <LogOut size={size} />
      {!iconOnly && 'Sair'}
    </button>
  )
}
