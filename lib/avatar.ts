import { prisma } from './prisma'

// A foto de perfil: onde ela mora, quem pode vê-la, e como a URL é montada.
//
// Mora no próprio banco (StoredFile). Antes ia para o Cloudinary, e o resultado prático era que
// ninguém tinha foto nenhuma: as três credenciais nunca foram configuradas, a rota respondia 503
// e o botão ficava desabilitado dizendo "não configurado neste servidor". O que estava quebrado
// não era o upload — era a configuração que não existia.
//
// Sem serviço externo não há transformação de imagem na entrega, então quem reduz a foto é o
// navegador, antes de subir (ver PhotoUpload). O que chega aqui já está no tamanho de exibição.

export const AVATAR_ROUTE = '/api/foto'

/** A URL servida para um arquivo de avatar. Uma função só, para o caminho existir num lugar. */
export function avatarPath(fileId: string): string {
  return `${AVATAR_ROUTE}/${fileId}`
}

/**
 * A URL que o componente Avatar usa.
 *
 * Continua existindo, e continua aceitando o `size`, porque URLs antigas do Cloudinary podem
 * estar gravadas em `User.photoUrl` — aquelas ainda são redimensionadas na entrega, e jogar fora
 * essa tradução deixaria uma foto antiga chegando em tamanho cheio. Para os caminhos locais o
 * `size` não tem efeito: a imagem já subiu pequena.
 */
export function avatarUrl(url: string | null | undefined, size = 160): string | null {
  if (!url) return null
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i < 0) return url
  const transform = `c_fill,g_face,w_${size},h_${size},q_auto,f_auto`
  return url.slice(0, i + marker.length) + transform + '/' + url.slice(i + marker.length)
}

/**
 * Quem pode ver a foto de alguém.
 *
 * Não é uma pergunta decorativa. A foto de um nutricionista está no perfil público dele, então é
 * pública de fato — esconder atrás de login só quebraria a busca. A de um paciente não: ela
 * aparece na lista de pacientes de quem o atende, e em nenhum outro lugar. Confiar apenas no id
 * do arquivo ser impossível de adivinhar seria usar o id como credencial, que é justamente o que
 * este projeto evita em toda parte.
 *
 * Devolve true quando `viewer` pode ver a foto de `owner`.
 */
export async function canViewAvatar(
  owner: { id: string; role: string; professionalId: string | null; professionalStatus: string | null },
  viewer: { id: string; role: string; professionalId?: string | null } | null
): Promise<boolean> {
  // Foto de nutricionista ativo é conteúdo de perfil público.
  if (owner.role === 'PROFESSIONAL' && owner.professionalStatus === 'ACTIVE') return true

  if (!viewer) return false
  if (viewer.id === owner.id) return true
  if (viewer.role === 'ADMIN') return true

  // O nutricionista vê a foto de quem se consulta com ele. A mesma relação que já o autoriza a
  // ver a lista de pacientes dele, e nada além dela.
  if (viewer.role === 'PROFESSIONAL' && viewer.professionalId) {
    const consulta = await prisma.appointment.findFirst({
      where: { professionalId: viewer.professionalId, patient: { userId: owner.id } },
      select: { id: true },
    })
    return consulta !== null
  }

  return false
}
