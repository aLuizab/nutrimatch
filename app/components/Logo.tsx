/**
 * O logotipo NutriMatch — proposta "Elo".
 *
 * Dois arcos que se atravessam: paciente e nutricionista ocupando o mesmo espaço. O arco da
 * frente é acento, o de trás é a cor do texto. O símbolo só existe com os dois — um arco
 * sozinho não é a marca, é meia marca.
 *
 * O wordmark é caixa baixa, peso 500 e entreletra −3,5%. Nada disso é ajustável por
 * propriedade de propósito: a identidade proíbe alterar o peso, inclinar ou aplicar sombra, e
 * um componente que aceita `bold` acaba recebendo `bold`.
 *
 * A cor do arco da frente troca com o tema porque a identidade manda: #357a54 sobre claro,
 * #7fd0a0 sobre escuro. As classes que fazem isso vivem em globals.css, junto das outras
 * regras que dependem de tema.
 */

const TAMANHOS = {
  sm: { simbolo: 28, texto: 'text-lg' },
  md: { simbolo: 36, texto: 'text-2xl' },
  lg: { simbolo: 52, texto: 'text-4xl' },
} as const

export type TamanhoLogo = keyof typeof TAMANHOS

/** O símbolo sozinho. Use abaixo de 120px, onde o wordmark deixa de ser legível. */
export function MarcaSimbolo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      role="img"
      aria-label="NutriMatch"
    >
      {/* Ordem importa: o arco de trás é desenhado primeiro para o da frente cruzar por cima. */}
      <path
        d="M26 12 a20 20 0 1 1 0 40"
        className="nm-arco-tras"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M38 12 a20 20 0 1 0 0 40"
        className="nm-arco-frente"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export default function Logo({
  size = 'md',
  semTexto = false,
  className = '',
}: {
  size?: TamanhoLogo
  semTexto?: boolean
  className?: string
}) {
  const { simbolo, texto } = TAMANHOS[size]

  if (semTexto) return <MarcaSimbolo size={simbolo} className={className} />

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <MarcaSimbolo size={simbolo} />
      <span
        className={`${texto} font-medium text-gray-900 leading-none`}
        style={{ letterSpacing: '-0.035em' }}
      >
        nutri<span className="nm-match">match</span>
      </span>
    </span>
  )
}
