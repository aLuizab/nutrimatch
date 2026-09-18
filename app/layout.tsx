import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

/**
 * Inter servida pelo próprio domínio.
 *
 * next/font baixa a fonte no build e a hospeda junto do app, o que evita uma requisição ao
 * Google no carregamento de cada página — e, de quebra, dispensa liberar fonts.googleapis.com
 * na CSP, que hoje só aceita `font-src 'self' data:`.
 *
 * `display: swap` mostra o texto na fonte do sistema enquanto a Inter carrega. A alternativa é
 * um bloco invisível de texto, que numa conexão ruim é a página parecendo quebrada.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fonte-inter',
})

export const metadata: Metadata = {
  title: 'NutriMatch — Encontre seu Nutricionista',
  description: 'Conecte-se a nutricionistas qualificados. Agende consultas online ou presenciais sem burocracia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased bg-gray-50 text-gray-900 font-sans">{children}</body>
    </html>
  )
}
