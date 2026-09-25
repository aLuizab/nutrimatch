// Aceite dos Termos de Uso.
//
// O aceite é registrado com data **e versão**. Um booleano "aceitou" não prova nada no dia em que
// alguém contesta: os termos mudam, e sem saber qual texto estava no ar faria parecer que todo
// mundo concordou com uma versão que nunca leu.

/**
 * A versão vigente dos Termos de Uso e da Política de Privacidade.
 *
 * É a data da última alteração de conteúdo daqueles textos, e não um número de sequência, porque
 * é isso que uma pessoa consegue conferir: ela abre /termos, vê a data e compara. **Ao mudar o
 * texto de /termos ou /privacidade, mude esta constante junto** — é o que distingue quem aceitou
 * o texto novo de quem aceitou o antigo.
 */
export const TERMS_VERSION = '2026-09-25'

/** Quem aceitou uma versão anterior (ou nenhuma) deveria ser convidado a aceitar de novo. */
export function needsTermsAcceptance(user: { termsVersion: string | null }): boolean {
  return user.termsVersion !== TERMS_VERSION
}
