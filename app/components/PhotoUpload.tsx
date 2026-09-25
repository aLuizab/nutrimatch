'use client'

import React, { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, Upload } from 'lucide-react'

/** O que o seletor de arquivos sugere. O servidor confere de novo — isto é só uma dica. */
const ACCEPTED = 'image/jpeg,image/png,image/webp'

/** Tamanho máximo do arquivo ORIGINAL que a pessoa escolhe, antes de ser reduzido. */
const MAX_BYTES = 12 * 1024 * 1024

/** Lado maior da imagem depois de reduzida. 512px cobre com folga o maior avatar exibido (80px
 *  em telas 2x), e é o que faz uma foto de 6MB do celular virar uns 60KB no banco. */
const MAX_DIMENSION = 512

/**
 * Reduz a imagem no navegador, antes de subir.
 *
 * Sem um serviço de imagens no meio, é aqui que a foto ganha tamanho de avatar. Fazer isso no
 * cliente também é o que torna o upload rápido no 4G: sobe um arquivo de 60KB, não os 6MB que
 * saíram da câmera. O servidor continua recusando o que passar do limite dele — reduzir aqui é
 * conveniência, nunca a validação.
 *
 * Cai de volta no arquivo original se algo der errado: uma foto grande que sobe é melhor que uma
 * foto que não sobe.
 */
async function reduzir(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const escala = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const largura = Math.max(1, Math.round(bitmap.width * escala))
    const altura = Math.max(1, Math.round(bitmap.height * escala))

    const canvas = document.createElement('canvas')
    canvas.width = largura
    canvas.height = altura
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, largura, altura)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.85)
    )
    if (!blob) return file
    return new File([blob], 'foto.webp', { type: 'image/webp' })
  } catch {
    return file
  }
}

/**
 * Foto de perfil: escolher, trocar e remover.
 *
 * A validação de tipo e tamanho acontece antes de qualquer trabalho, para o erro mais comum — uma
 * foto enorme direto da câmera — falhar na hora em vez de no fim de um upload longo.
 */
export default function PhotoUpload({
  name,
  photoUrl,
}: {
  name: string
  photoUrl: string | null
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
      setError('Escolha uma imagem de até 12MB.')
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', await reduzir(file))
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
            disabled={busy}
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
        ) : (
          <p className="text-xs text-gray-400 mt-1.5">
            JPG, PNG ou WebP. A imagem é reduzida automaticamente antes de subir.
          </p>
        )}
      </div>
    </div>
  )
}
