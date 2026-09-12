import { prisma } from './prisma'
import { extractUf } from './crn'
import { SPECIALTIES } from './specialties'
import { addMonthsToDateString, instantAt, spDateString } from './spdate'

// Statistical honesty is the whole point of this module. The platform is new: at the time of
// writing it holds 8 professionals and 11 consultations. Any "trend" drawn from that is noise
// dressed as insight, and an admin who acts on it is acting on nothing. So every aggregation
// here returns its own sample size alongside the numbers, and the page refuses to draw a chart
// whose sample is below the minimum for that shape of claim. The minimums are declared here,
// in one place, so they can be argued with instead of being buried in JSX.
export const MIN_SAMPLE = {
  // A count-per-category bar chart is honest at low n as long as it's read as counts and not
  // as a rate — but below this the ordering between categories is decided by one or two rows.
  categoryCounts: 8,
  // A rate (cancellation, confirmation) has a confidence interval that swamps the estimate at
  // small n: at 11 consultations a single cancellation moves the rate by 9 points.
  rate: 30,
  // A trend needs enough periods to have a shape at all. Two points are a line segment, not a
  // trend; three is the bare minimum for a direction to mean anything.
  periods: 3,
  // A cross-tab multiplies the sample thinly across cells. With 5 states and 7 specialties
  // there are 35 cells, so the total has to be large before a cell count is worth reading.
  crossTab: 40,
} as const

export interface Sampled<T> {
  data: T
  sample: number
  /** Below this the caller must not draw the chart. */
  minimum: number
  sufficient: boolean
}

function sampled<T>(data: T, sample: number, minimum: number): Sampled<T> {
  return { data, sample, minimum, sufficient: sample >= minimum }
}

export interface CategoryCount {
  label: string
  count: number
}

export interface MonthPoint {
  month: string // YYYY-MM
  label: string // "ago/26"
  consultations: number
  revenue: number
}

export interface FunnelStage {
  label: string
  count: number
  hint: string
}

export interface CrossTabCell {
  uf: string
  specialty: string
  count: number
}

export interface TrendsData {
  specialtySupply: Sampled<CategoryCount[]>
  specialtyDemand: Sampled<CategoryCount[]>
  byUf: Sampled<CategoryCount[]>
  crossTab: Sampled<{ ufs: string[]; specialties: string[]; cells: CrossTabCell[]; max: number }>
  months: Sampled<MonthPoint[]>
  funnel: FunnelStage[]
  cancellation: Sampled<{ cancelled: number; expired: number; total: number; rate: number }>
  unknownUfCount: number
}

const MONTH_LABELS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function monthLabel(month: string) {
  const [y, m] = month.split('-')
  return `${MONTH_LABELS[Number(m) - 1]}/${y.slice(2)}`
}

export async function getTrends(monthsBack = 12): Promise<TrendsData> {
  const todayStr = spDateString(new Date())
  const firstOfThisMonth = `${todayStr.slice(0, 7)}-01`
  const windowStartStr = addMonthsToDateString(firstOfThisMonth, -(monthsBack - 1))
  const windowStart = instantAt(windowStartStr, '00:00')

  const [professionals, appointments, withAvailability] = await Promise.all([
    prisma.professional.findMany({
      select: { id: true, city: true, specialties: true, status: true },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: windowStart } },
      select: {
        status: true,
        scheduledAt: true,
        price: true,
        professional: { select: { city: true, specialties: true } },
      },
    }),
    prisma.availabilityRule
      .findMany({ select: { professionalId: true }, distinct: ['professionalId'] })
      .then((rows) => new Set(rows.map((r) => r.professionalId))),
  ])

  const active = professionals.filter((p) => p.status === 'ACTIVE')

  // ── Supply: how many professionals offer each specialty ────────────────────
  // One professional with three specialties counts in all three, so the column total exceeds
  // the professional count. That's correct for "how much of each is on offer" and is spelled
  // out in the panel's caption rather than being silently confusing.
  const supply = new Map<string, number>()
  for (const s of SPECIALTIES) supply.set(s.long, 0)
  for (const p of active) for (const s of p.specialties) supply.set(s, (supply.get(s) ?? 0) + 1)

  // ── Demand: consultations booked, attributed to the professional's specialties ──
  // The appointment itself carries no specialty — a patient books a person, not a field. So a
  // consultation with a professional who lists two specialties counts toward both. This
  // over-counts by construction and the caption says so; the alternative (crediting only the
  // first specialty) would silently under-count the rest, which is worse because it looks
  // precise.
  const demand = new Map<string, number>()
  for (const s of SPECIALTIES) demand.set(s.long, 0)
  const booked = appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'AWAITING_CONFIRMATION')
  for (const a of booked) {
    for (const s of a.professional.specialties) demand.set(s, (demand.get(s) ?? 0) + 1)
  }

  const toSorted = (m: Map<string, number>): CategoryCount[] =>
    [...m.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'))

  // ── Region ─────────────────────────────────────────────────────────────────
  // city is free text ("São Paulo, SP"), so the state is parsed out rather than assumed. Rows
  // that don't parse become a reported count, never a silent drop and never a guess.
  const ufCounts = new Map<string, number>()
  let unknownUfCount = 0
  for (const p of active) {
    const uf = extractUf(p.city)
    if (!uf) {
      unknownUfCount++
      continue
    }
    ufCounts.set(uf, (ufCounts.get(uf) ?? 0) + 1)
  }

  // ── Specialty × region cross-tab ───────────────────────────────────────────
  const cellMap = new Map<string, number>()
  for (const a of booked) {
    const uf = extractUf(a.professional.city)
    if (!uf) continue
    for (const s of a.professional.specialties) {
      const key = `${uf}|${s}`
      cellMap.set(key, (cellMap.get(key) ?? 0) + 1)
    }
  }
  const crossUfs = [...new Set([...cellMap.keys()].map((k) => k.split('|')[0]))].sort()
  const crossSpecialties = SPECIALTIES.map((s) => s.long).filter((s) =>
    crossUfs.some((uf) => (cellMap.get(`${uf}|${s}`) ?? 0) > 0)
  )
  const cells: CrossTabCell[] = crossUfs.flatMap((uf) =>
    crossSpecialties.map((specialty) => ({ uf, specialty, count: cellMap.get(`${uf}|${specialty}`) ?? 0 }))
  )
  const crossMax = cells.reduce((m, c) => Math.max(m, c.count), 0)

  // ── Months ─────────────────────────────────────────────────────────────────
  const monthMap = new Map<string, { consultations: number; revenue: number }>()
  for (let i = 0; i < monthsBack; i++) {
    const m = addMonthsToDateString(firstOfThisMonth, -i).slice(0, 7)
    monthMap.set(m, { consultations: 0, revenue: 0 })
  }
  for (const a of appointments) {
    if (a.status !== 'CONFIRMED') continue
    const m = spDateString(a.scheduledAt).slice(0, 7)
    const entry = monthMap.get(m)
    if (!entry) continue
    entry.consultations++
    entry.revenue += a.price
  }
  const allMonths: MonthPoint[] = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, label: monthLabel(month), ...v }))
  // Leading empty months are absence of platform, not a real zero — trimming them stops the
  // chart from drawing a flat line across months where nothing could have happened.
  const firstNonEmpty = allMonths.findIndex((m) => m.consultations > 0)
  const months = firstNonEmpty === -1 ? [] : allMonths.slice(firstNonEmpty)
  const monthsWithData = months.filter((m) => m.consultations > 0).length

  // ── Funnel ─────────────────────────────────────────────────────────────────
  // Absolute counts at each stage. A funnel of counts stays truthful at any sample size (it
  // is a census of what exists, not an estimate), which is why it has no gate — only the
  // conversion percentages between stages would need one, so they aren't shown.
  const professionalsWithAppointment = new Set(
    (
      await prisma.appointment.findMany({
        where: { status: { in: ['CONFIRMED', 'AWAITING_CONFIRMATION'] } },
        select: { professionalId: true },
        distinct: ['professionalId'],
      })
    ).map((a) => a.professionalId)
  )
  const funnel: FunnelStage[] = [
    { label: 'Cadastrados', count: professionals.length, hint: 'Contas de profissional criadas' },
    { label: 'Aprovados', count: active.length, hint: 'CRN verificado pelo admin' },
    {
      label: 'Com agenda',
      count: active.filter((p) => withAvailability.has(p.id)).length,
      hint: 'Definiram horários de atendimento',
    },
    {
      label: 'Com consulta',
      count: active.filter((p) => professionalsWithAppointment.has(p.id)).length,
      hint: 'Receberam ao menos um agendamento',
    },
  ]

  // ── Cancellation ───────────────────────────────────────────────────────────
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length
  const expired = appointments.filter((a) => a.status === 'EXPIRED').length
  const totalAppointments = appointments.length
  const rate = totalAppointments > 0 ? (cancelled + expired) / totalAppointments : 0

  return {
    specialtySupply: sampled(toSorted(supply), active.length, MIN_SAMPLE.categoryCounts),
    specialtyDemand: sampled(toSorted(demand), booked.length, MIN_SAMPLE.categoryCounts),
    byUf: sampled(toSorted(ufCounts), active.length - unknownUfCount, MIN_SAMPLE.categoryCounts),
    crossTab: sampled(
      { ufs: crossUfs, specialties: crossSpecialties, cells, max: crossMax },
      booked.length,
      MIN_SAMPLE.crossTab
    ),
    months: sampled(months, monthsWithData, MIN_SAMPLE.periods),
    funnel,
    cancellation: sampled(
      { cancelled, expired, total: totalAppointments, rate },
      totalAppointments,
      MIN_SAMPLE.rate
    ),
    unknownUfCount,
  }
}
