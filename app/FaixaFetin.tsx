import { ArrowUpRight } from 'lucide-react'

/**
 * Faixa fina no topo da página inicial.
 *
 * Fica acima do cabeçalho de propósito: é contexto sobre a origem do projeto, não navegação, e
 * ocupa o lugar onde esse tipo de aviso é esperado — sem empurrar o título para baixo da dobra.
 *
 * "FETIN" aparece por extenso porque a sigla sozinha não diz nada a um paciente que chegou pela
 * busca, e é ele quem mais visita esta página. Em tela estreita o nome longo é ocultado e resta
 * a sigla com o ano, que cabe.
 */
export default function FaixaFetin() {
  return (
    <a
      href="https://inatel.br/fetin/"
      target="_blank"
      // Sem noopener, a página de destino recebe uma referência a esta janela e pode redirecioná-la.
      rel="noopener noreferrer"
      className="block bg-gray-900 text-gray-300 hover:text-white transition-colors"
    >
      <p className="max-w-7xl mx-auto px-6 py-2 text-center text-[11px] font-medium flex items-center justify-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden />
        Projeto participante da <strong className="font-bold text-white">FETIN 2026</strong>
        <span className="hidden sm:inline">· Feira Tecnológica do Inatel</span>
        <ArrowUpRight size={12} className="shrink-0" />
      </p>
    </a>
  )
}
