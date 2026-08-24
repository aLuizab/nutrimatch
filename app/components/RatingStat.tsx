import { Star } from 'lucide-react'

// A professional with zero reviews shows a "Novo" badge — a literal "0.0" next to a filled
// star reads as a terrible rating, not a new profile.
export default function RatingStat({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  if (reviewCount === 0) {
    return (
      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
        Novo
      </span>
    )
  }
  return (
    <span className="flex items-center gap-1">
      <Star size={13} className="text-yellow-400 fill-yellow-400" />
      <span className="text-xs font-bold text-gray-700">{rating.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({reviewCount})</span>
    </span>
  )
}
