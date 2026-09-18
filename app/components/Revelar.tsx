'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Revela o conteúdo quando ele entra na tela.
 *
 * Duas decisões que evitam o defeito clássico deste padrão:
 *
 * O estado inicial é "visível". Só depois que o JavaScript roda o elemento é marcado como
 * pendente e escondido. Se o script falhar, for bloqueado ou ainda não tiver carregado, a
 * pessoa lê a página normalmente — em vez de encarar uma tela em branco cheia de conteúdo com
 * `opacity: 0` que nunca vai aparecer.
 *
 * E o observador se desconecta na primeira aparição: reanimar a cada rolagem é irritante para
 * quem sobe e desce a página, e mantém um observador vivo por seção sem necessidade.
 */
export default function Revelar({
  children,
  atraso = 0,
  className = '',
}: {
  children: ReactNode
  /** Milissegundos, para escalonar itens de uma mesma sequência. */
  atraso?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<'pendente' | 'visivel' | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // A partir daqui o JavaScript está vivo, então esconder é seguro.
    setEstado('pendente')

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada.isIntersecting) return
        observador.disconnect()
        window.setTimeout(() => setEstado('visivel'), atraso)
      },
      // Antecipa um pouco: o elemento termina de aparecer quando chega ao campo de visão
      // confortável, e não depois que a pessoa já está olhando para ele.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 }
    )
    observador.observe(el)
    return () => observador.disconnect()
  }, [atraso])

  return (
    <div ref={ref} className={`revelar ${className}`} data-revelar={estado ?? undefined}>
      {children}
    </div>
  )
}
