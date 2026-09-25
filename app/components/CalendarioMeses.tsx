'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { weekdayOf } from '@/lib/spdate'

// Um mês por vez, com navegação presa à janela em que marcar consulta faz sentido.
//
// Mês a mês e não três meses empilhados: num celular, três grades de 42 células viram uma
// rolagem em que ninguém acha nada. A navegação trava nos limites da janela, então não existe
// "avançar para um mês em que nada pode acontecer".
//
// O componente não sabe o que uma data significa — só desenha o que `marcas` disser. É o que
// permite a mesma grade servir ao paciente escolhendo horário e ao nutricionista marcando férias,
// que são leituras opostas do mesmo calendário.

const DIAS_DA_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

export interface MarcaDeDia {
  /** Classes de cor aplicadas ao dia. */
  tone: string
  /** Linha pequena sob o número — contagem de vagas, "fechado", o que fizer sentido. */
  nota?: string
  /** Sem nada a fazer neste dia: fica visível, mas não clicável. */
  disabled?: boolean
  /** Texto do title, para quem passa o mouse. */
  title?: string
}

function mesDe(dateStr: string) {
  return dateStr.slice(0, 7)
}

function diasDoMes(mes: string): string[] {
  const [y, m] = mes.split('-').map(Number)
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return Array.from({ length: total }, (_, i) => `${mes}-${String(i + 1).padStart(2, '0')}`)
}

function mesSeguinte(mes: string, passo: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + passo, 1))
  return d.toISOString().slice(0, 7)
}

function rotuloDoMes(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} de ${y}`
}

export default function CalendarioMeses({
  primeiroDia,
  ultimoDia,
  marcas,
  selecionado,
  onSelecionar,
}: {
  /** Primeira data navegável, 'YYYY-MM-DD'. Normalmente hoje. */
  primeiroDia: string
  /** Última data navegável, 'YYYY-MM-DD'. */
  ultimoDia: string
  marcas: Record<string, MarcaDeDia>
  selecionado: string | null
  onSelecionar: (dateStr: string) => void
}) {
  // Abre no mês da data já escolhida, quando há uma: reabrir a tela num mês diferente daquele em
  // que a pessoa estava é como ela perde o lugar.
  const [mes, setMes] = useState(() => mesDe(selecionado ?? primeiroDia))

  const primeiroMes = mesDe(primeiroDia)
  const ultimoMes = mesDe(ultimoDia)
  const podeVoltar = mes > primeiroMes
  const podeAvancar = mes < ultimoMes

  const celulas = useMemo(() => {
    const dias = diasDoMes(mes)
    // Espaços em branco até o primeiro dia cair na coluna do seu dia da semana.
    const vazios = Array.from({ length: weekdayOf(dias[0]) }, () => null)
    return [...vazios, ...dias]
  }, [mes])

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => podeVoltar && setMes(mesSeguinte(mes, -1))}
          disabled={!podeVoltar}
          aria-label="Mês anterior"
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-bold text-gray-900 capitalize">{rotuloDoMes(mes)}</p>
        <button
          type="button"
          onClick={() => podeAvancar && setMes(mesSeguinte(mes, 1))}
          disabled={!podeAvancar}
          aria-label="Mês seguinte"
          className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS_DA_SEMANA.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {celulas.map((dateStr, i) => {
          if (!dateStr) return <div key={`vazio-${i}`} />

          const foraDaJanela = dateStr < primeiroDia || dateStr > ultimoDia
          const marca = marcas[dateStr]
          const bloqueado = foraDaJanela || marca?.disabled || !marca
          const ehSelecionado = selecionado === dateStr

          return (
            <button
              type="button"
              key={dateStr}
              disabled={bloqueado}
              title={marca?.title}
              onClick={() => onSelecionar(dateStr)}
              className={`aspect-square rounded-lg border text-xs flex flex-col items-center justify-center transition-colors ${
                ehSelecionado
                  ? 'border-emerald-500 bg-emerald-500 text-white font-bold ring-2 ring-emerald-200'
                  : bloqueado
                    ? 'border-transparent text-gray-300 cursor-not-allowed'
                    : `${marca.tone} hover:border-emerald-400`
              }`}
            >
              <span className={ehSelecionado ? '' : 'font-medium'}>{Number(dateStr.slice(8, 10))}</span>
              {marca?.nota && (
                <span className="text-[9px] leading-tight opacity-80 mt-0.5">{marca.nota}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
