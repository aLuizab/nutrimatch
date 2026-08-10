import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriMatch — Encontre seu Nutricionista',
  description: 'Conecte-se a nutricionistas qualificados. Agende consultas online ou presenciais sem burocracia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-gray-50">{children}</body>
    </html>
  )
}
