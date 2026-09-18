'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Conta de zero até o valor quando entra na tela.
 *
 * O número final é renderizado no servidor e fica no HTML desde o começo — a animação só
 * substitui o texto depois que o JavaScript assume. Quem está sem script, ou usa leitor de
 * tela, lê o valor correto; ninguém vê "0" travado.
 *
 * `requestAnimationFrame` em vez de `setInterval`: o navegador decide a cadência, então a
 * contagem acompanha a taxa de quadros da tela e pausa sozinha quando a aba sai de foco.
 */
export default function Contador({
  valor,
  duracao = 1100,
  className = '',
}: {
  valor: string
  duracao?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [texto, setTexto] = useState(valor)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Só anima número puro ou decimal simples. "1.234" ou "4,9" contam; qualquer outra coisa
    // fica como está em vez de virar NaN na tela.
    const limpo = valor.replace(/\./g, '').replace(',', '.')
    const alvo = Number(limpo)
    if (!Number.isFinite(alvo) || alvo === 0) return

    const casas = valor.includes(',') ? 1 : 0
    const formata = (n: number) =>
      casas > 0 ? n.toFixed(casas).replace('.', ',') : Math.round(n).toLocaleString('pt-BR')

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observador = new IntersectionObserver(([entrada]) => {
      if (!entrada.isIntersecting) return
      observador.disconnect()

      const inicio = performance.now()
      const passo = (agora: number) => {
        const t = Math.min(1, (agora - inicio) / duracao)
        // Desacelera no fim: a contagem "chega" no número em vez de parar de supetão.
        const suave = 1 - (1 - t) ** 3
        setTexto(formata(alvo * suave))
        if (t < 1) requestAnimationFrame(passo)
      }
      setTexto(formata(0))
      requestAnimationFrame(passo)
    })

    observador.observe(el)
    return () => observador.disconnect()
  }, [valor, duracao])

  return (
    <span ref={ref} className={className}>
      {texto}
    </span>
  )
}
