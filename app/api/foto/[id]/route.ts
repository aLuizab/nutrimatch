import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { canViewAvatar } from '@/lib/avatar'
import { contentDisposition } from '@/lib/stored-files'

// Entrega de foto de perfil. Rota separada de /api/arquivos/[id] porque a pergunta de
// autorização é outra: comprovante de repasse é documento de duas pessoas, foto de nutricionista
// é conteúdo de perfil público. Misturar as duas numa rota só acabaria com a regra mais frouxa
// valendo para o documento mais sensível.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const arquivo = await prisma.storedFile.findUnique({
    where: { id },
    include: {
      userAvatar: {
        select: {
          id: true,
          role: true,
          professional: { select: { id: true, status: true } },
        },
      },
    },
  })
  // 404 e não 403: responder "existe, mas não é seu" já conta que aquele id vale alguma coisa.
  if (!arquivo?.userAvatar) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
  }

  const dono = arquivo.userAvatar
  const publica = dono.role === 'PROFESSIONAL' && dono.professional?.status === 'ACTIVE'

  // getCurrentUser toca o banco, então só é chamado quando a resposta depende de quem pergunta.
  const viewer = publica ? null : await getCurrentUser()
  const autorizado = await canViewAvatar(
    {
      id: dono.id,
      role: dono.role,
      professionalId: dono.professional?.id ?? null,
      professionalStatus: dono.professional?.status ?? null,
    },
    viewer ? { id: viewer.id, role: viewer.role, professionalId: viewer.professional?.id ?? null } : null
  )
  if (!autorizado) {
    return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(arquivo.bytes), {
    headers: {
      'Content-Type': arquivo.mimeType,
      'Content-Length': String(arquivo.sizeBytes),
      'Content-Disposition': contentDisposition(arquivo.fileName),
      // O id do arquivo muda a cada troca de foto, então a URL é imutável: dá para cachear
      // agressivamente sem nunca servir uma imagem velha. Foto de profissional pode ficar em
      // cache compartilhado; a de paciente, nunca — a resposta depende de quem pediu.
      'Cache-Control': publica
        ? 'public, max-age=86400, immutable'
        : 'private, max-age=3600, immutable',
    },
  })
}
