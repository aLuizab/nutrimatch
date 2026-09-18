import Link from 'next/link'
import Avatar from '../components/Avatar'
import { MapPin, Video, Users, Clock } from 'lucide-react'
import RatingStat from '../components/RatingStat'
import TierBadge from '../components/TierBadge'
import type { ProfessionalCard } from '@/lib/professionals'

/**
 * One professional in the results list. Shared by the organic list and the sponsored band so
 * the two can never drift apart visually — a sponsored card that looked different from an
 * organic one in any way other than its label would be doing the labelling's job badly.
 */
export default function ResultCard({ n, sponsored = false }: { n: ProfessionalCard; sponsored?: boolean }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:border-emerald-200 elevar-no-hover">
      <div className="flex items-center gap-4">
        <Avatar name={n.name} photoUrl={n.photoUrl} size={56} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{n.name}</h3>
                <TierBadge tier={n.tier} />
                {sponsored && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md">
                    Patrocinado
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">{n.specialtyLabel}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <RatingStat rating={n.rating} reviewCount={n.reviewCount} />
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <MapPin size={12} /> {n.city}
                </div>
                {n.responseLabel && (
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <Clock size={12} /> {n.responseLabel}
                  </div>
                )}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  {n.modality !== 'PRESENCIAL' ? <Video size={12} /> : <Users size={12} />}
                  {n.modalityLabel}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">R$ {n.price}</p>
                <p className="text-xs text-gray-400">/consulta</p>
              </div>
              <Link
                href={`/perfil/${n.id}`}
                className="bg-emerald-500 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-emerald-600 transition-colors"
              >
                Ver perfil
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
