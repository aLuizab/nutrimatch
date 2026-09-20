const REMETENTE_PADRAO = 'NutriMatch <onboarding@resend.dev>'

/** Aceita `email@dominio` ou `Nome <email@dominio>`, que é o que a Resend exige. */
const FORMATO_ACEITO = /^(?:[^<>@\s][^<>@]*\s)?<?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/

let avisouSobreRemetente = false

/**
 * Remetente das mensagens, tolerante ao erro mais provável de configuração.
 *
 * O `.env.example` traz o valor entre aspas, como todo arquivo de ambiente. Copiado para o
 * painel do Railway, as aspas vão junto — e o campo vira `"NutriMatch <onboarding@resend.dev>"`,
 * com aspas literais. A Resend recusa com 422 `Invalid from field`, e **todo e-mail da
 * plataforma para de sair**: confirmação de consulta, solicitação para o nutricionista,
 * recuperação de senha. O único sinal é uma linha de log que ninguém está olhando.
 *
 * Tirar as aspas resolve o caso real sem inventar nada. Se ainda assim o formato não servir,
 * cai no padrão e avisa uma vez — mandar do endereço de teste é ruim, mas não mandar é pior.
 */
function remetente(): string {
  const cru = process.env.EMAIL_FROM?.trim()
  if (!cru) return REMETENTE_PADRAO

  // Aspas simples ou duplas em volta do valor inteiro, não as que fazem parte de um nome.
  const semAspas = cru.replace(/^(['"])([\s\S]*)\1$/, '$2').trim()
  if (FORMATO_ACEITO.test(semAspas)) return semAspas

  if (!avisouSobreRemetente) {
    avisouSobreRemetente = true
    console.warn(
      `[email] EMAIL_FROM não está num formato que a Resend aceita (recebido: ${JSON.stringify(cru)}). ` +
        `Use "email@dominio.com" ou "Nome <email@dominio.com>", sem aspas em volta. ` +
        `Enviando de ${REMETENTE_PADRAO} por enquanto.`
    )
  }
  return REMETENTE_PADRAO
}

// Thin Resend REST client. Without RESEND_API_KEY every send is logged to the console
// instead — dev and CI work with zero e-mail setup, and no notification path ever throws.
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY
  const from = remetente()

  if (!apiKey) {
    console.log(`[email:console-fallback] to=${to} subject="${subject}"`)
    return
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject, html }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error(`[email] Resend returned ${res.status} for "${subject}" to ${to}: ${body}`)
  }
}
