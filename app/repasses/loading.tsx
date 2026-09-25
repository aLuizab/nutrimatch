import EsqueletoDePainel from '../components/EsqueletoDePainel'

// Sem este arquivo, clicar num link para esta área não muda nada na tela até o servidor terminar
// de renderizar — e ainda impede o prefetch da rota. Ver o comentário em EsqueletoDePainel.
export default function Loading() {
  return <EsqueletoDePainel tabela />
}
