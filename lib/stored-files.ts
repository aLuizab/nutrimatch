import { prisma } from './prisma'

// Arquivos guardados no banco. Ver o comentário do model StoredFile no schema para o porquê de
// não haver serviço externo aqui.
//
// A validação de tipo e tamanho vive neste arquivo, e não em cada rota, porque é a mesma
// pergunta em todo lugar e porque a resposta errada custa caro: um `bytea` sem limite é um
// caminho direto para alguém encher o banco.

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
/** Comprovante de transferência sai do app do banco como imagem ou PDF. */
export const RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

export const MAX_AVATAR_BYTES = 512 * 1024
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export interface FileRules {
  maxBytes: number
  types: readonly string[]
}

export const RECEIPT_RULES: FileRules = { maxBytes: MAX_RECEIPT_BYTES, types: RECEIPT_TYPES }
export const AVATAR_RULES: FileRules = { maxBytes: MAX_AVATAR_BYTES, types: AVATAR_TYPES }

export type FileRejection = { error: string }

export function isRejection(v: unknown): v is FileRejection {
  return typeof v === 'object' && v !== null && 'error' in v
}

/**
 * Confere o que veio no multipart antes de qualquer escrita.
 *
 * O `accept` do input é dica para o seletor de arquivos e nada mais, então o tipo é conferido
 * aqui de novo. O tamanho também: o navegador pode ter validado, e um cliente que não é o
 * navegador não validou nada.
 */
export function checkUpload(file: unknown, rules: FileRules): File | FileRejection {
  if (!(file instanceof File) || file.size === 0) return { error: 'Nenhum arquivo enviado' }
  if (!rules.types.includes(file.type)) {
    const legivel = rules.types.includes('application/pdf') ? 'JPG, PNG, WebP ou PDF' : 'JPG, PNG ou WebP'
    return { error: `Envie um arquivo ${legivel}` }
  }
  if (file.size > rules.maxBytes) {
    const mb = Math.round((rules.maxBytes / (1024 * 1024)) * 10) / 10
    return { error: `O arquivo precisa ter no máximo ${mb}MB` }
  }
  return file
}

/** Grava o arquivo e devolve o id. O chamador é quem decide a quem esse id se liga. */
export async function storeFile(file: File, uploadedBy: string): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer())
  const stored = await prisma.storedFile.create({
    data: {
      mimeType: file.type,
      sizeBytes: bytes.byteLength,
      // O nome vem do cliente, então nunca é usado como caminho — só como sugestão de download.
      fileName: file.name.slice(0, 180) || 'arquivo',
      bytes,
      uploadedBy,
    },
    select: { id: true },
  })
  return stored.id
}

/** Cabeçalho de download seguro para um nome que veio de fora. */
export function contentDisposition(fileName: string): string {
  // Só ASCII no parâmetro simples; o nome de verdade vai no filename*, que é o que os
  // navegadores leem. Sem isso, um nome com acento quebra o header.
  // Sem regex de propósito: o que sobra tem de ser ASCII imprimível e não pode conter aspas
  // nem barra invertida, que são justamente o que quebraria o header ao ser reinterpretado.
  const ascii = Array.from(fileName, (c) =>
    c >= ' ' && c <= '~' && c !== '"' && c !== String.fromCharCode(92) ? c : '_'
  ).join('')
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
