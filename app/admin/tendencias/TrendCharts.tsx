import { AlertCircle } from 'lucide-react'
import { formatPrice } from '@/lib/format'
import type { CategoryCount, FunnelStage, MonthPoint, Sampled } from '@/lib/trends'

// Server-rendered inline SVG, same approach as app/patient/evolucao/WeightChart.tsx — no chart
// library, no client boundary. Hover detail is a native <svg><title>; every chart ships a table
// underneath so no value is reachable only by hovering.
//
// Palette: one hue (the app's emerald), because every chart here is a single series. The
// ordinal funnel ramp is emerald 500/600/700/800, validated against the white card surface —
// monotone lightness, adjacent ΔL ≥ 0.06, light end 2.54:1. Emerald 400 and lighter fail the
// 2:1 light-end floor on white and are deliberately not used for data marks.
const INK = '#10b981'
const ORDINAL = ['#10b981', '#059669', '#047857', '#065f46']
const GRID = '#f3f4f6'
const AXIS_TEXT = '#9ca3af'
const LABEL_TEXT = '#374151'

export function Panel({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <section className="bg-surface border border-gray-100 rounded-2xl p-6">
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      {caption && <p className="text-xs text-gray-500 mt-1 leading-relaxed">{caption}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

/**
 * What a panel shows instead of a chart when the sample can't support one. Saying "ainda não dá
 * para afirmar" is the whole feature: a chart drawn over 11 rows looks exactly as authoritative
 * as one drawn over 11.000, and that resemblance is what makes it dangerous.
 */
export function InsufficientData({
  sample,
  minimum,
  what,
}: {
  sample: number
  minimum: number
  what: string
}) {
  return (
    <div className="flex gap-3 items-start bg-amber-50 border border-amber-100 rounded-xl px-4 py-3.5">
      <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-medium text-amber-900">Amostra insuficiente para concluir algo</p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          {what} com <strong>{sample}</strong> {sample === 1 ? 'registro' : 'registros'}; este painel só
          desenha o gráfico a partir de <strong>{minimum}</strong>. Abaixo disso a variação vem do acaso,
          não do comportamento dos usuários — os números brutos continuam na tabela abaixo.
        </p>
      </div>
    </div>
  )
}

function CountTable({ rows, unit }: { rows: CategoryCount[]; unit: string }) {
  const total = rows.reduce((s, r) => s + r.count, 0)
  return (
    <table className="w-full text-sm mt-4">
      <caption className="sr-only">Valores em número de {unit}</caption>
      <thead>
        <tr className="text-xs text-gray-400 uppercase tracking-wide">
          <th className="text-left font-medium pb-2">Categoria</th>
          <th className="text-right font-medium pb-2">{unit}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t border-gray-50">
            <td className="py-1.5 text-gray-700">{r.label}</td>
            <td className="py-1.5 text-right text-gray-900 font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {r.count}
            </td>
          </tr>
        ))}
        <tr className="border-t border-gray-200">
          <td className="py-1.5 text-gray-500 text-xs">Total</td>
          <td className="py-1.5 text-right text-gray-500 text-xs" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {total}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/** Rounded only at the data end; the baseline end stays square so bars sit on the axis. */
function barPath(x: number, y: number, w: number, h: number, r = 4) {
  const rr = Math.min(r, w)
  if (w <= 0.5) return ''
  return `M ${x} ${y} H ${x + w - rr} Q ${x + w} ${y} ${x + w} ${y + rr} V ${y + h - rr} Q ${x + w} ${y + h} ${
    x + w - rr
  } ${y + h} H ${x} Z`
}

/**
 * Horizontal bars: the categories here are specialty names too long to sit under vertical
 * columns. One hue for every bar — a darker-where-bigger ramp on nominal categories would
 * double-encode length as color and burn the only free channel on information already shown.
 */
export function HorizontalBars({
  sampled,
  unit,
  // The sentence fragment the shortfall message completes ("Há apenas 8 registros") — a
  // different string from the chart's accessible name, which has to stand on its own.
  shortfall,
  description,
  valueLabel,
}: {
  sampled: Sampled<CategoryCount[]>
  unit: string
  shortfall: string
  description: string
  valueLabel?: (n: number) => string
}) {
  const rows = sampled.data.filter((r) => r.count > 0)

  if (!sampled.sufficient) {
    return (
      <>
        <InsufficientData sample={sampled.sample} minimum={sampled.minimum} what={shortfall} />
        <CountTable rows={sampled.data} unit={unit} />
      </>
    )
  }
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">Nenhum registro no período.</p>
  }

  const rowH = 30
  const gap = 2 // surface gap between adjacent bars — never a border around the mark
  const labelW = 168
  const valueW = 44
  const W = 640
  const H = rows.length * rowH
  const plotW = W - labelW - valueW
  const max = Math.max(...rows.map((r) => r.count))

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`${description}. Maior valor: ${rows[0].label}, com ${rows[0].count} ${unit}.`}>
        {rows.map((r, i) => {
          const y = i * rowH
          const w = (r.count / max) * plotW
          return (
            <g key={r.label}>
              <text x={labelW - 10} y={y + rowH / 2 + 4} textAnchor="end" fontSize="12" fill={LABEL_TEXT}>
                {r.label}
              </text>
              <path d={barPath(labelW, y + gap, Math.max(w, 2), rowH - gap * 2 - 6)} fill={INK} />
              {/* Direct value label: the emerald mark sits at 2.54:1 on white, under the 3:1
                  bar, so the relief rule applies — the number is always visible, never
                  hover-only. */}
              <text
                x={labelW + w + 8}
                y={y + rowH / 2 + 4}
                fontSize="12"
                fontWeight="700"
                fill={LABEL_TEXT}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {valueLabel ? valueLabel(r.count) : r.count}
              </text>
              <rect x={labelW} y={y} width={plotW} height={rowH} fill="transparent">
                <title>
                  {r.label}: {r.count} {unit}
                </title>
              </rect>
            </g>
          )
        })}
      </svg>
      <CountTable rows={sampled.data} unit={unit} />
    </>
  )
}

/**
 * Funnel of absolute counts. No gate: this is a census of what exists, not an estimate from a
 * sample. The conversion percentages between stages would need one, so they aren't drawn —
 * "3 de 8" is honest at n=8 in a way that "37,5%" is not.
 */
export function Funnel({ stages }: { stages: FunnelStage[] }) {
  const max = Math.max(...stages.map((s) => s.count), 1)
  const rowH = 52
  const W = 640
  const labelW = 130
  const valueW = 40
  const plotW = W - labelW - valueW
  const H = stages.length * rowH

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Funil: ${stages.map((s) => `${s.label} ${s.count}`).join(', ')}.`}>
        {stages.map((s, i) => {
          const y = i * rowH
          const w = (s.count / max) * plotW
          const drop = i > 0 ? stages[i - 1].count - s.count : 0
          return (
            <g key={s.label}>
              <text x={labelW - 10} y={y + 20} textAnchor="end" fontSize="12" fontWeight="600" fill={LABEL_TEXT}>
                {s.label}
              </text>
              <text x={labelW - 10} y={y + 35} textAnchor="end" fontSize="10" fill={AXIS_TEXT}>
                {drop > 0 ? `−${drop} nesta etapa` : ''}
              </text>
              <path d={barPath(labelW, y + 6, Math.max(w, 2), rowH - 18)} fill={ORDINAL[i] ?? ORDINAL[ORDINAL.length - 1]} />
              <text
                x={labelW + w + 8}
                y={y + rowH / 2 + 1}
                fontSize="13"
                fontWeight="700"
                fill={LABEL_TEXT}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {s.count}
              </text>
              <rect x={labelW} y={y} width={plotW} height={rowH} fill="transparent">
                <title>
                  {s.label}: {s.count} — {s.hint}
                </title>
              </rect>
            </g>
          )
        })}
      </svg>
      <table className="w-full text-sm mt-4">
        <thead>
          <tr className="text-xs text-gray-400 uppercase tracking-wide">
            <th className="text-left font-medium pb-2">Etapa</th>
            <th className="text-left font-medium pb-2">Significa</th>
            <th className="text-right font-medium pb-2">Profissionais</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((s) => (
            <tr key={s.label} className="border-t border-gray-50">
              <td className="py-1.5 text-gray-700">{s.label}</td>
              <td className="py-1.5 text-gray-500 text-xs">{s.hint}</td>
              <td className="py-1.5 text-right text-gray-900 font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {s.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}

/**
 * One measure per chart. Consultations and revenue are on wildly different scales, and putting
 * them on two y-axes in one plot would invent a correlation the data doesn't contain — so this
 * renders once per measure instead.
 */
export function MonthlyLine({
  sampled,
  measure,
}: {
  sampled: Sampled<MonthPoint[]>
  measure: 'consultations' | 'revenue'
}) {
  const points = sampled.data
  const value = (p: MonthPoint) => (measure === 'consultations' ? p.consultations : p.revenue)
  const fmt = (n: number) => (measure === 'consultations' ? String(n) : formatPrice(n))

  if (!sampled.sufficient) {
    return (
      <>
        <InsufficientData
          sample={sampled.sample}
          minimum={sampled.minimum}
          what={`A plataforma tem movimento em apenas ${sampled.sample} ${sampled.sample === 1 ? 'mês' : 'meses'}`}
        />
        <table className="w-full text-sm mt-4">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wide">
              <th className="text-left font-medium pb-2">Mês</th>
              <th className="text-right font-medium pb-2">{measure === 'consultations' ? 'Consultas' : 'Receita'}</th>
            </tr>
          </thead>
          <tbody>
            {points.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-3 text-center text-gray-400 text-sm">
                  Nenhuma consulta registrada ainda.
                </td>
              </tr>
            ) : (
              points.map((p) => (
                <tr key={p.month} className="border-t border-gray-50">
                  <td className="py-1.5 text-gray-700">{p.label}</td>
                  <td className="py-1.5 text-right text-gray-900 font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(value(p))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </>
    )
  }

  const W = 640
  const H = 220
  const padL = 52
  const padR = 40
  const padT = 14
  const padB = 30 // x-axis band lives inside the viewBox so labels are never clipped
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const max = Math.max(...points.map(value), 1)
  const x = (i: number) => padL + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW)
  const y = (v: number) => padT + (1 - v / max) * plotH
  const coords = points.map((p, i) => ({ p, cx: x(i), cy: y(value(p)) }))
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ')
  const area = `${line} L ${coords[coords.length - 1].cx.toFixed(1)} ${padT + plotH} L ${coords[0].cx.toFixed(1)} ${padT + plotH} Z`
  const ticks = Array.from({ length: 4 }, (_, i) => (max * i) / 3)
  const last = coords[coords.length - 1]

  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Evolução mensal de ${measure === 'consultations' ? 'consultas' : 'receita'}.`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={AXIS_TEXT} style={{ fontVariantNumeric: 'tabular-nums' }}>
              {measure === 'consultations' ? Math.round(t) : `${Math.round(t / 100)}`}
            </text>
          </g>
        ))}
        <path d={area} fill={INK} fillOpacity="0.1" />
        <path d={line} fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.map((c) => (
          <g key={c.p.month}>
            <circle cx={c.cx} cy={c.cy} r="4.5" fill={INK} stroke="#ffffff" strokeWidth="2" />
            <circle cx={c.cx} cy={c.cy} r="14" fill="transparent">
              <title>
                {c.p.label}: {fmt(value(c.p))}
              </title>
            </circle>
            <text x={c.cx} y={H - 10} textAnchor="middle" fontSize="11" fill={AXIS_TEXT}>
              {c.p.label}
            </text>
          </g>
        ))}
        {/* Endpoint only — a number on every point goes unread */}
        <text x={last.cx + 9} y={last.cy + 4} fontSize="12" fontWeight="700" fill={LABEL_TEXT}>
          {fmt(value(last.p))}
        </text>
      </svg>
      {measure === 'revenue' && <p className="text-xs text-gray-400 mt-1">Eixo em reais.</p>}
    </>
  )
}

/**
 * Specialty × region. Deliberately a table and not a heatmap: 7 specialties × 5 states is 35
 * cells, and colouring counts of 0–2 produces a picture where the eye reads regional patterns
 * that a single extra booking would rearrange. The colour only switches on above the crossTab
 * minimum, at which point cells carry enough weight to be shaded.
 */
export function CrossTab({
  sampled,
  unknownUfCount,
}: {
  sampled: Sampled<{ ufs: string[]; specialties: string[]; cells: { uf: string; specialty: string; count: number }[]; max: number }>
  unknownUfCount: number
}) {
  const { ufs, specialties, cells, max } = sampled.data
  const at = (uf: string, s: string) => cells.find((c) => c.uf === uf && c.specialty === s)?.count ?? 0
  // Sequential shading, one hue, light→dark, only once the sample justifies it.
  const shade = (n: number) => {
    if (!sampled.sufficient || n === 0 || max === 0) return undefined
    const idx = Math.min(ORDINAL.length - 1, Math.floor((n / max) * ORDINAL.length))
    return { backgroundColor: ORDINAL[idx], color: '#ffffff' }
  }

  if (ufs.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">Nenhuma consulta com região identificada ainda.</p>
  }

  return (
    <>
      {!sampled.sufficient && (
        <InsufficientData
          sample={sampled.sample}
          minimum={sampled.minimum}
          what="O cruzamento especialidade × região distribui as consultas em dezenas de células e hoje há"
        />
      )}
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-sm border-separate" style={{ borderSpacing: '2px' }}>
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wide pb-2">Especialidade</th>
              {ufs.map((uf) => (
                <th key={uf} className="text-center text-xs font-medium text-gray-400 uppercase tracking-wide pb-2 px-2">
                  {uf}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specialties.map((s) => (
              <tr key={s}>
                <td className="text-gray-700 py-1.5 pr-3 whitespace-nowrap">{s}</td>
                {ufs.map((uf) => {
                  const n = at(uf, s)
                  const style = shade(n)
                  return (
                    <td
                      key={uf}
                      className={`text-center py-1.5 rounded-md font-medium ${
                        style ? '' : n > 0 ? 'text-gray-900 bg-gray-50' : 'text-gray-300'
                      }`}
                      style={{ ...style, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {n || '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {unknownUfCount > 0 && (
        <p className="text-xs text-gray-400 mt-3">
          {unknownUfCount} {unknownUfCount === 1 ? 'profissional está' : 'profissionais estão'} fora da tabela: a
          cidade cadastrada não traz a sigla do estado. Não foram atribuídos a nenhuma região.
        </p>
      )}
    </>
  )
}
