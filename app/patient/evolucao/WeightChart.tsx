import { formatDateBR } from '@/lib/format'

export interface ChartPoint {
  recordedAt: Date
  weightKg: number
}

// Server-rendered inline SVG — no chart library, no client boundary. Hover detail comes from
// native <svg><title> tooltips, and the measurements table below the chart is the accessible
// twin, so no value is reachable only by hovering.
export default function WeightChart({
  points,
  targetWeightKg,
}: {
  points: ChartPoint[]
  targetWeightKg: number | null
}) {
  if (points.length === 0) return null

  if (points.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-3 h-3 rounded-full bg-emerald-500 mb-3" />
        <p className="text-2xl font-bold text-gray-900">{points[0].weightKg.toFixed(1)} kg</p>
        <p className="text-sm text-gray-500 mt-1">{formatDateBR(points[0].recordedAt)}</p>
        <p className="text-xs text-gray-400 mt-3">Registre outra medida para ver sua evolução.</p>
      </div>
    )
  }

  const W = 720
  const H = 260
  const padL = 44
  const padR = 52
  const padT = 16
  const padB = 34 // x-axis band lives inside the viewBox so labels are never clipped
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const weights = points.map((p) => p.weightKg)
  const domainValues = targetWeightKg != null ? [...weights, targetWeightKg] : weights
  const rawMin = Math.min(...domainValues)
  const rawMax = Math.max(...domainValues)
  // Guard: identical values would make (max-min)=0 and every y a NaN, which renders a blank
  // SVG with no error. Padding by at least 1kg keeps the domain non-degenerate.
  const pad = Math.max((rawMax - rawMin) * 0.15, 1)
  const min = rawMin - pad
  const max = rawMax + pad

  const t0 = points[0].recordedAt.getTime()
  const t1 = points[points.length - 1].recordedAt.getTime()
  const tSpan = t1 - t0 || 1

  const x = (d: Date) => padL + ((d.getTime() - t0) / tSpan) * plotW
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH

  const coords = points.map((p) => ({ ...p, cx: x(p.recordedAt), cy: y(p.weightKg) }))
  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${coords[coords.length - 1].cx.toFixed(1)} ${padT + plotH} L ${coords[0].cx.toFixed(1)} ${padT + plotH} Z`

  const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * i) / 3)
  const labelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  )
  const last = coords[coords.length - 1]
  const first = coords[0]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      role="img"
      aria-label={`Evolução do peso de ${first.weightKg.toFixed(1)} kg em ${formatDateBR(
        first.recordedAt
      )} para ${last.weightKg.toFixed(1)} kg em ${formatDateBR(last.recordedAt)}.`}
    >
      <title>
        Evolução do peso: {first.weightKg.toFixed(1)} kg → {last.weightKg.toFixed(1)} kg
      </title>

      {/* Gridlines: solid hairlines one step off the surface, never dashed */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#9ca3af" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {(Math.round(t * 10) / 10).toFixed(1)}
          </text>
        </g>
      ))}

      {/* Target line is a real threshold, so dashing is meaningful here (unlike a grid) */}
      {targetWeightKg != null && (
        <g>
          <line
            x1={padL}
            x2={padL + plotW}
            y1={y(targetWeightKg)}
            y2={y(targetWeightKg)}
            stroke="#d1d5db"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text x={padL + plotW + 6} y={y(targetWeightKg) + 4} fontSize="10" fill="#9ca3af">
            meta
          </text>
        </g>
      )}

      <path d={areaPath} fill="#10b981" fillOpacity="0.1" />
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {coords.map((c, i) => (
        <g key={i}>
          {/* 2px surface ring keeps markers legible where they cross the line */}
          <circle cx={c.cx} cy={c.cy} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
          {/* Oversized transparent hit area — a 10px dot is too small to hover reliably */}
          <circle cx={c.cx} cy={c.cy} r="14" fill="transparent">
            <title>
              {formatDateBR(c.recordedAt)}: {c.weightKg.toFixed(1)} kg
            </title>
          </circle>
        </g>
      ))}

      {/* Label the endpoint only — a number on every point is chaos and goes unread */}
      <text x={last.cx + 10} y={last.cy + 4} fontSize="12" fontWeight="700" fill="#374151">
        {last.weightKg.toFixed(1)}
      </text>

      {labelIdx.map((i) => (
        <text
          key={i}
          x={Math.min(Math.max(coords[i].cx, padL + 18), padL + plotW - 18)}
          y={H - 12}
          textAnchor="middle"
          fontSize="11"
          fill="#9ca3af"
        >
          {formatDateBR(coords[i].recordedAt).slice(0, 5)}
        </text>
      ))}
    </svg>
  )
}
