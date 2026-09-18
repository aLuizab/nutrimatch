import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure } from '@/lib/api-failures'
import {
  ALLOWED_PHOTO_TYPES,
  MAX_PHOTO_BYTES,
  deletePhoto,
  photoUploadsEnabled,
  uploadPhoto,
} from '@/lib/cloudinary'

async function currentUser() {
  const user = await getCurrentUser()
  if (!user) throw new AuthError('Não autenticado')
  return user
}

export async function POST(request: Request) {
  let user
  try {
    user = await currentUser()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'profile-photo')
  if (limited) return limited

  if (!photoUploadsEnabled()) {
    return NextResponse.json(
      { error: 'O envio de fotos ainda não está configurado neste servidor.' },
      { status: 503 }
    )
  }

  try {
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }
    // Checked here rather than trusting the accept attribute on the input, which is a hint to
    // the file picker and nothing more.
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Envie uma imagem JPG, PNG ou WebP' }, { status: 400 })
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json({ error: 'A imagem precisa ter no máximo 2MB' }, { status: 400 })
    }

    const uploaded = await uploadPhoto(file, user.id)
    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: uploaded.url, photoPublicId: uploaded.publicId },
    })
    return NextResponse.json({ photoUrl: uploaded.url })
  } catch (e) {
    return unexpectedFailure('profile-photo', e)
  }
}

export async function DELETE() {
  let user
  try {
    user = await currentUser()
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: 401 })
    throw e
  }

  const limited = guardMutation(user.id, 'profile-photo')
  if (limited) return limited

  try {
    const existing = await prisma.user.findUnique({
      where: { id: user.id },
      select: { photoPublicId: true },
    })
    // The database row is cleared first: if the remote delete fails, the person still sees the
    // photo gone, which is what they asked for. The reverse order can leave them looking at an
    // image they just removed.
    await prisma.user.update({
      where: { id: user.id },
      data: { photoUrl: null, photoPublicId: null },
    })
    if (existing?.photoPublicId) await deletePhoto(existing.photoPublicId)
    return NextResponse.json({ photoUrl: null })
  } catch (e) {
    return unexpectedFailure('profile-photo-delete', e)
  }
}
