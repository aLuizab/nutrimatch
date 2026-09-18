'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Upload } from 'lucide-react'

const MAX_BYTES = 2 * 1024 * 1024
const ACCEPTED = 'image/jpeg,image/png,image/webp'

/**
 * Validates size and type before the upload starts, so the common mistake — a 6MB photo
 * straight from a phone camera — fails instantly instead of after a long upload on mobile data.
 * The server checks the same things again; this is about the wait, not about trust.
 */
export default function PhotoUpload({
  name,
  photoUrl,
  enabled,
}: {
  name: string
  photoUrl: string | null
  enabled: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Shown immediately from the chosen file, so the new photo appears while it uploads.
  const [preview, setPreview] = useState<string | null>(null)

  const current = preview ?? photoUrl

  async function send(file: File) {
    setError(null)
    if (!ACCEPTED.split(',').includes(file.type)) {
      setError('Envie uma imagem JPG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('A imagem precisa ter no máximo 2MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', file)
      const res = await fetch('/api/profile/photo', { method: 'POST', body })
      const data = await res.json().catch(() => ({}) as { error?: string; photoUrl?: string })
      if (!res.ok) {
        setPreview(null)
        setError(data.error ?? 'Não foi possível enviar a foto.')
        return
      }
      router.refresh()
    } catch {
      setPreview(null)
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setBusy(false)
      URL.revokeObjectURL(localUrl)
    }
  }

  async function remove() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/profile/photo', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string })
        setError(data.error ?? 'Não foi possível remover a foto.')
        return
      }
      setPreview(null)
      router.refresh()
    } catch {
      setError('Não foi possível conectar ao servidor. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- pode ser um blob local
          <img src={current} alt={name} className="w-20 h-20 rounded-full object-cover bg-gray-100" />
        ) : (
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
            {name.trim().slice(0, 1).toUpperCase()}
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
            <Loader2 size={20} className="text-white animate-spin" />
          </div>
        )}
      </div>

      <div>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            // Reset the input so choosing the same file twice in a row fires onChange again.
            e.target.value = ''
            if (file) void send(file)
          }}
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!enabled || busy}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 border border-emerald-200 px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={14} />
            {current ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {current && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
              Remover
            </button>
          )}
        </div>

        {error ? (
          <p className="text-xs text-red-600 mt-1.5">{error}</p>
        ) : enabled ? (
          <p className="text-xs text-gray-400 mt-1.5">JPG, PNG ou WebP. Máximo 2MB.</p>
        ) : (
          <p className="text-xs text-amber-600 mt-1.5">
            O envio de fotos ainda não foi configurado neste servidor.
          </p>
        )}
      </div>
    </div>
  )
}
