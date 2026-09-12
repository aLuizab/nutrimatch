// Estados brasileiros: 26 + DF, uma lista fixa que não muda (a última mudança foi a criação do
// Tocantins em 1988) — por isso fica hardcoded aqui em vez de vir de uma API a cada carregamento
// de página, ao contrário das cidades, que são numerosas e mudam raramente o suficiente para
// justificar buscar sob demanda em vez de embutir ~5600 linhas no bundle. Ver
// app/api/locations/municipios/route.ts.
export interface BrazilState {
  uf: string
  nome: string
}

export const BRAZIL_STATES: BrazilState[] = [
  { uf: 'AC', nome: 'Acre' },
  { uf: 'AL', nome: 'Alagoas' },
  { uf: 'AP', nome: 'Amapá' },
  { uf: 'AM', nome: 'Amazonas' },
  { uf: 'BA', nome: 'Bahia' },
  { uf: 'CE', nome: 'Ceará' },
  { uf: 'DF', nome: 'Distrito Federal' },
  { uf: 'ES', nome: 'Espírito Santo' },
  { uf: 'GO', nome: 'Goiás' },
  { uf: 'MA', nome: 'Maranhão' },
  { uf: 'MT', nome: 'Mato Grosso' },
  { uf: 'MS', nome: 'Mato Grosso do Sul' },
  { uf: 'MG', nome: 'Minas Gerais' },
  { uf: 'PA', nome: 'Pará' },
  { uf: 'PB', nome: 'Paraíba' },
  { uf: 'PR', nome: 'Paraná' },
  { uf: 'PE', nome: 'Pernambuco' },
  { uf: 'PI', nome: 'Piauí' },
  { uf: 'RJ', nome: 'Rio de Janeiro' },
  { uf: 'RN', nome: 'Rio Grande do Norte' },
  { uf: 'RS', nome: 'Rio Grande do Sul' },
  { uf: 'RO', nome: 'Rondônia' },
  { uf: 'RR', nome: 'Roraima' },
  { uf: 'SC', nome: 'Santa Catarina' },
  { uf: 'SP', nome: 'São Paulo' },
  { uf: 'SE', nome: 'Sergipe' },
  { uf: 'TO', nome: 'Tocantins' },
]

const VALID_UFS = new Set(BRAZIL_STATES.map((s) => s.uf))

export function isValidUf(uf: string): boolean {
  return VALID_UFS.has(uf.toUpperCase())
}

/** Formato canônico salvo em Patient.city / Professional.city: "Cidade, UF". */
export function formatCityState(cityName: string, uf: string): string {
  return `${cityName}, ${uf.toUpperCase()}`
}
