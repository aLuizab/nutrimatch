import type { Modality } from '@prisma/client'

// A regra que liga o formato presencial ao endereço do consultório.
//
// Um paciente que marca presencial sem saber para onde ir descobre isso no dia da consulta, e
// nesse momento não há mais o que fazer: ele já reservou a tarde, já pagou, e o horário do
// profissional também se perdeu. Por isso a exigência é estrutural, e não um aviso: sem endereço,
// o formato presencial simplesmente não fica disponível para escolher.
//
// A regra mora aqui, e não em cada rota, porque ela é conferida em quatro lugares — cadastro,
// edição de perfil, aprovação pelo admin e a tela que mostra o formulário. Repetida, é questão de
// tempo até um deles ficar para trás.

export const ENDERECO_MINIMO = 10

/** Um endereço utilizável: existe e é longo o bastante para alguém chegar nele. */
export function hasOffice(professional: { officeAddress?: string | null } | null | undefined): boolean {
  return (professional?.officeAddress?.trim().length ?? 0) >= ENDERECO_MINIMO
}

/** Os formatos que dependem de haver um endereço. */
export function requiresOffice(modality: Modality): boolean {
  return modality === 'PRESENCIAL' || modality === 'AMBOS'
}

export const SEM_ENDERECO_ERRO =
  'Para atender presencialmente, informe o endereço do consultório. Sem ele, só o formato online fica disponível.'

/**
 * Valida o par (formato, endereço). Devolve a mensagem do problema, ou null quando está tudo bem.
 *
 * Recebe os dois porque a pergunta só faz sentido junta: nem endereço sozinho, nem formato
 * sozinho, dizem se a combinação pode ser salva.
 */
export function validateOffice(modality: Modality, officeAddress: string | null | undefined): string | null {
  if (!requiresOffice(modality)) return null
  if ((officeAddress?.trim().length ?? 0) >= ENDERECO_MINIMO) return null
  return SEM_ENDERECO_ERRO
}

/**
 * O formato que de fato vale, dado o que o profissional tem cadastrado.
 *
 * Existe para a leitura, não para a escrita: se um perfil antigo ficou com PRESENCIAL e sem
 * endereço — e existem, porque a coluna nasceu depois deles —, a busca e o agendamento precisam
 * tratá-lo como ONLINE em vez de oferecer um presencial que ninguém sabe onde acontece.
 */
export function effectiveModality(professional: {
  modality: Modality
  officeAddress?: string | null
}): Modality {
  if (!requiresOffice(professional.modality)) return professional.modality
  if (hasOffice(professional)) return professional.modality
  return 'ONLINE'
}
