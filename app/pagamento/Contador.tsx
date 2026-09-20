'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Timer } from 'lucide-react'

/**
 * Contagem regressiva até o horário deixar de estar reservado.
 *
 * Existe porque "pague até 14:32" não comunica urgência: exige que a pessoa olhe o relógio,
 * faça a conta e conclua sozinha que tem pouco tempo. Um número que anda faz isso por ela.
 *
 * O prazo é calculado no servidor e chega como ISO; o componente só formata. Zerar aqui não
 * cancela nada — quem decide é `isExpiredAwaiting` no servidor, a cada leitura. O contador é a
 * representação de uma regra que existe, nunca a regra em si: um relógio de cliente adiantado
 * não pode cancelar a consulta de ninguém.
 */
export default function Contador({ deadlineISO }: { deadlineISO: string }) {
  const alvo = new Date(deadlineISO).getTime()
  const [restam, setRestam] = useState(() => alvo - Date.now())

  useEffect(() => {
    const t = setInterval(() => setRestam(alvo - Date.now()), 1000)
    return () => clearInterval(t)
  }, [alvo])

  if (restam <= 0) {
    return (
      <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mt-4 text-left">
        <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
        <p className="text-sm text-red-800 leading-relaxed">
          <strong>O tempo acabou e o horário foi liberado.</strong> Se você chegou a pagar, fale
          com a gente antes de agendar de novo — não pague duas vezes.
        </p>
      </div>
    )
  }

  const totalSeg = Math.floor(restam / 1000)
  const min = Math.floor(totalSeg / 60)
  const seg = totalSeg % 60
  // Abaixo de 5 minutos o aviso muda de cor: é quando ainda dá tempo de agir, mas só se a
  // pessoa perceber agora.
  const apertado = totalSeg <= 300

  return (
    <div
      className={`rounded-xl px-4 py-3 mt-4 border text-left ${
        apertado ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
      }`}
    >
      <div className="flex items-center gap-2">
        <Timer size={15} className={apertado ? 'text-red-600' : 'text-amber-600'} />
        <span
          className={`font-bold tabular-nums text-lg ${apertado ? 'text-red-700' : 'text-amber-800'}`}
        >
          {min}:{String(seg).padStart(2, '0')}
        </span>
        <span className={`text-sm ${apertado ? 'text-red-700' : 'text-amber-800'}`}>
          para garantir este horário
        </span>
      </div>
      <p className={`text-xs mt-1.5 leading-relaxed ${apertado ? 'text-red-700' : 'text-amber-800'}`}>
        Passando disso o agendamento é <strong>cancelado</strong> e o horário volta para outros
        pacientes — você precisaria marcar de novo.
      </p>
    </div>
  )
}
