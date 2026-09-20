'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

export type Tema = 'claro' | 'escuro' | 'sistema'

export const CHAVE_TEMA = 'nutrimatch:tema'

/**
 * Script que roda antes da primeira pintura.
 *
 * Sem ele a página nasce no tema claro e troca para o escuro assim que o React hidrata — um
 * clarão branco a cada navegação, que é pior que não ter tema escuro. Por isso é uma string
 * injetada no <head> e não um efeito: efeito roda depois da pintura.
 *
 * Fica deliberadamente pequeno e sem dependência. O try/catch existe porque `localStorage`
 * lança em janela anônima com dados bloqueados, e um tema errado é bem melhor que uma página
 * em branco.
 */
export const SCRIPT_ANTI_PISCADA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  CHAVE_TEMA
)});if(t==='claro'||t==='escuro'){document.documentElement.setAttribute('data-theme',t==='escuro'?'dark':'light')}}catch(e){}})()`

const OPCOES: { id: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { id: 'claro', rotulo: 'Claro', Icone: Sun },
  { id: 'escuro', rotulo: 'Escuro', Icone: Moon },
  { id: 'sistema', rotulo: 'Sistema', Icone: Monitor },
]

function aplicar(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'sistema') raiz.removeAttribute('data-theme')
  else raiz.setAttribute('data-theme', tema === 'escuro' ? 'dark' : 'light')
}

function lerPreferencia(): Tema {
  try {
    const guardado = localStorage.getItem(CHAVE_TEMA)
    if (guardado === 'claro' || guardado === 'escuro') return guardado
  } catch {
    // Sem armazenamento, o sistema decide. Não é motivo para quebrar nada.
  }
  return 'sistema'
}

/**
 * Onde a pessoa escolhe entre claro, escuro e o que o sistema operacional disser.
 *
 * "Sistema" é o padrão e é a terceira opção de propósito: quem nunca escolheu nada não quer
 * escolher agora, quer que o aparelho decida. Guardar "sistema" como uma escolha explícita
 * seria fixar o tema no valor que o sistema tinha naquele dia.
 */
export default function SeletorDeTema({ compacto = false }: { compacto?: boolean }) {
  // Começa em 'sistema' e só lê a preferência depois de montar: o servidor não tem como saber
  // o que está no localStorage, e divergir dele no primeiro render é erro de hidratação.
  const [tema, setTema] = useState<Tema>('sistema')
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    setTema(lerPreferencia())
    setMontado(true)
  }, [])

  function escolher(novo: Tema) {
    setTema(novo)
    const raiz = document.documentElement
    raiz.classList.add('trocando-tema')
    aplicar(novo)
    try {
      if (novo === 'sistema') localStorage.removeItem(CHAVE_TEMA)
      else localStorage.setItem(CHAVE_TEMA, novo)
    } catch {
      // A escolha vale para esta aba mesmo sem conseguir guardar.
    }
    window.setTimeout(() => raiz.classList.remove('trocando-tema'), 220)
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={`inline-flex items-center gap-0.5 rounded-xl border border-gray-100 bg-surface-high p-0.5 ${
        compacto ? '' : 'shadow-sm'
      }`}
    >
      {OPCOES.map(({ id, rotulo, Icone }) => {
        const ativo = montado && tema === id
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => escolher(id)}
            title={rotulo}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors ${
              ativo
                ? 'bg-emerald-50 text-emerald-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Icone size={14} aria-hidden="true" />
            {!compacto && <span>{rotulo}</span>}
          </button>
        )
      })}
    </div>
  )
}
