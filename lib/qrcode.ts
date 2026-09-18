import QRCode from 'qrcode'

/**
 * Gera o QR no servidor, como data URI.
 *
 * A alternativa preguiçosa seria montar um <img> apontando para um gerador de QR público. Isso
 * entregaria o link de pagamento de cada consulta a um terceiro não contratado, colocaria a
 * disponibilidade dele entre o paciente e o pagamento, e ainda esbarraria na CSP, que só aceita
 * imagem do próprio domínio, data: e blob:. Gerar aqui resolve os três de uma vez — data: já é
 * permitido, e o custo é alguns milissegundos por render.
 *
 * Correção de erro em nível M (15%): o QR vai ser lido da tela de um celular, muitas vezes por
 * outro celular, e sobra margem para reflexo e foco ruim sem o código ficar grande demais.
 */
export async function qrDataUrl(content: string, size = 240): Promise<string | null> {
  try {
    return await QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size,
      color: { dark: '#111827', light: '#ffffff' },
    })
  } catch (e) {
    // Um QR que não gerou não pode derrubar a tela de pagamento: o link continua clicável, que
    // é o caminho principal de quem já está no celular. O QR serve a quem está no computador.
    console.error('[qrcode] falha ao gerar', e)
    return null
  }
}
