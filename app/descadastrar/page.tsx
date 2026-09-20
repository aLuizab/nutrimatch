import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'
import PublicHeader from '../components/PublicHeader'
import ConfirmarDescadastro from './ConfirmarDescadastro'

export const dynamic = 'force-dynamic'

/**
 * Descadastro de comunicados, sem exigir login.
 *
 * A confirmação é um botão e não o próprio clique do link porque provedores de e-mail e
 * antivírus corporativos abrem os links das mensagens para checá-los. Um descadastro que
 * acontece só de abrir a URL tira da lista gente que nunca clicou em nada — e a pessoa só
 * descobre meses depois, quando nota que parou de receber.
 */
export default async function Descadastrar({
  searchParams,
}: {
  searchParams: Promise<{ u?: string; t?: string }>
}) {
  const { u, t } = await searchParams
  const valido = Boolean(u && t && verifyUnsubscribeToken(u, t))

  const user = valido
    ? await prisma.user.findUnique({ where: { id: u! }, select: { name: true, notifyNews: true } })
    : null

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <PublicHeader />
      <div className="max-w-md mx-auto px-6 py-16">
        <div className="bg-surface rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          {!valido || !user ? (
            <>
              <h1 className="text-lg font-bold text-gray-900">Link inválido</h1>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                Este link de descadastro não é válido ou expirou. Você pode ajustar suas
                preferências de e-mail entrando na sua conta.
              </p>
              <Link
                href="/login"
                className="inline-block mt-5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
              >
                Entrar na minha conta
              </Link>
            </>
          ) : !user.notifyNews ? (
            <>
              <h1 className="text-lg font-bold text-gray-900">Você já está fora da lista</h1>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                {user.name.split(' ')[0]}, você não recebe mais novidades da plataforma. Avisos
                sobre suas consultas e sua conta continuam chegando normalmente.
              </p>
            </>
          ) : (
            <ConfirmarDescadastro userId={u!} token={t!} firstName={user.name.split(' ')[0]} />
          )}
        </div>
      </div>
    </div>
  )
}
