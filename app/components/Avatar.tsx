import { avatarUrl } from '@/lib/avatar'
import { avatarColor, initials } from '@/lib/format'

/**
 * One place that decides between a photo and coloured initials.
 *
 * The initials are not a placeholder waiting to be replaced — most people never upload a photo,
 * and a deterministic colour per name reads as intentional where a grey silhouette reads as
 * broken. Both branches render the same circle at the same size so layouts never shift when a
 * photo appears.
 */
export default function Avatar({
  name,
  photoUrl,
  size = 40,
  className = '',
}: {
  name: string
  photoUrl?: string | null
  size?: number
  className?: string
}) {
  const src = avatarUrl(photoUrl, size * 2) // 2x para telas retina
  const style = { width: size, height: size }

  if (src) {
    return (
      /* A imagem já foi reduzida antes de subir (ver PhotoUpload), então chega no tamanho de
         exibição; next/image só acrescentaria uma segunda camada de resize sobre ela. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        style={style}
        className={`rounded-full object-cover bg-gray-100 ${className}`}
      />
    )
  }

  return (
    <div
      style={style}
      className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${avatarColor(name)} ${className}`}
      aria-label={name}
    >
      <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>{initials(name)}</span>
    </div>
  )
}
