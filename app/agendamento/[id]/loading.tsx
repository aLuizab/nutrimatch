import EsqueletoPublico from '../../components/EsqueletoPublico'

// Ver o comentario em EsqueletoPublico: sem este arquivo o clique nao muda nada na tela ate o
// servidor responder, e a rota deixa de ser pre-buscada.
export default function Loading() {
  return <EsqueletoPublico />
}
