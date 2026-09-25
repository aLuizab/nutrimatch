import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { AuthError, getCurrentUser } from '@/lib/session'
import { guardMutation } from '@/lib/rate-limit'
import { unexpectedFailure } from '@/lib/api-failures'
import { avatarPath } from '@/lib/avatar'
import { AVATAR_RULES, checkUpload, isRejection, storeFile } from '@/lib/stored-files'

// Troca e remoção da foto de perfil.
//
// Não há mais 503 "não configurado neste servidor": a imagem vai para o próprio banco, então o
// recurso funciona em qualquer instalação, incluindo a máquina de quem desenvolve. Era esse 503 —
// e não um defeito no upload — que mantinha o botão desabilitado para todo mundo.

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

  try {
    const form = await request.formData().catch(() => null)
    // Tipo e tamanho conferidos aqui de novo, e não só no navegador: o `accept` do input é dica
    // para o seletor de arquivos, e um cliente que não é o navegador não validou nada. O limite é
    // apertado (512KB) porque a imagem chega já reduzida — ver PhotoUpload.
    const checked = checkUpload(form?.get('file'), AVATAR_RULES)
    if (isRejection(checked)) return NextResponse.json({ error: checked.error }, { status: 400 })

    const anterior = user.avatarFileId
    const fileId = await storeFile(checked, user.id)

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarFileId: fileId, photoUrl: avatarPath(fileId), photoPublicId: null },
    })

    // Só depois de a nova foto estar no ar. Apagar antes deixaria a pessoa sem foto nenhuma se a
    // gravação falhasse no meio.
    if (anterior) await prisma.storedFile.delete({ where: { id: anterior } }).catch(() => undefined)

    return NextResponse.json({ photoUrl: avatarPath(fileId) })
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
    // A linha do usuário é limpa primeiro: se apagar o arquivo falhar, a pessoa ainda vê a foto
    // sumir, que é o que ela pediu. Na ordem inversa ela continuaria olhando o que acabou de
    // remover.
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarFileId: null, photoUrl: null, photoPublicId: null },
    })
    if (user.avatarFileId) {
      await prisma.storedFile.delete({ where: { id: user.avatarFileId } }).catch(() => undefined)
    }
    return NextResponse.json({ photoUrl: null })
  } catch (e) {
    return unexpectedFailure('profile-photo-delete', e)
  }
}
