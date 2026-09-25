import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/session'
import { contentDisposition } from '@/lib/stored-files'

// Entrega de um arquivo guardado no banco.
//
// Não existe URL pública nem adivinhável aqui: comprovante de repasse é documento financeiro de
// duas pessoas específicas, e o id de um arquivo não é credencial de nada. Toda requisição passa
// pela pergunta "quem é você e o que este arquivo tem a ver com você".
//
// Quem pode ver um comprovante:
//   - qualquer ADMIN, que é quem faz e confere repasse;
//   - o profissional dono do repasse, que é a outra ponta da transferência.
// Mais ninguém. Um arquivo que não está ligado a nenhum repasse não é servido a ninguém além de
// quem o enviou — sem dono declarado, não há como decidir quem tem direito a ele.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const file = await prisma.storedFile.findUnique({
    where: { id },
    include: { payoutReceipt: { select: { professionalId: true } } },
  })
  // 404 e não 403 para quem não pode ver: responder "existe, mas não é seu" já conta se um id
  // vale alguma coisa, e aqui isso não interessa a ninguém.
  if (!file) return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })

  const ehAdmin = user.role === 'ADMIN'
  const ehDonoDoRepasse =
    file.payoutReceipt != null && user.professional?.id === file.payoutReceipt.professionalId
  const ehQuemEnviou = file.uploadedBy === user.id
  if (!ehAdmin && !ehDonoDoRepasse && !ehQuemEnviou) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Length': String(file.sizeBytes),
      'Content-Disposition': contentDisposition(file.fileName),
      // Documento financeiro não entra em cache de proxy nenhum, e o navegador guarda só o
      // suficiente para a pessoa abrir duas vezes sem baixar de novo.
      'Cache-Control': 'private, max-age=300',
    },
  })
}
