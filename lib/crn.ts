// CRN validation.
//
// IMPORTANT: there is no official public API for verifying a nutritionist's CRN. The CFN
// (Conselho Federal de Nutrição) publishes only a web consultation portal, with no endpoint
// for third-party integration. So this module validates everything that CAN be checked
// deterministically — format, regional council number, and whether the declared regional
// actually covers the declared state — and the admin confirms the registration against the
// official portal before approving. See CFN_CONSULTA_URL below.

// The 11 regional councils and the states each one covers (Lei 6.583/78).
export const CRN_REGIONS: { region: number; states: string[] }[] = [
  { region: 1, states: ['DF', 'GO', 'MT', 'TO'] },
  { region: 2, states: ['RS'] },
  { region: 3, states: ['SP', 'MS'] },
  { region: 4, states: ['ES', 'RJ'] },
  { region: 5, states: ['BA', 'SE'] },
  { region: 6, states: ['AL', 'PB', 'PE', 'RN'] },
  { region: 7, states: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR'] },
  { region: 8, states: ['PR'] },
  { region: 9, states: ['MG'] },
  { region: 10, states: ['SC'] },
  { region: 11, states: ['CE', 'MA', 'PI'] },
]

export const CFN_CONSULTA_URL = 'https://cfn.org.br/consulta-nacional-de-nutricionistas/'

// D = definitivo, P = provisório, S = secundário. Absence of a suffix also means definitivo.
export type CrnKind = 'D' | 'P' | 'S'

export interface ParsedCrn {
  region: number
  number: string
  kind: CrnKind
  /** Canonical form stored in the DB, e.g. "CRN-3 12345/D". */
  formatted: string
}

export function statesForRegion(region: number): string[] {
  return CRN_REGIONS.find((r) => r.region === region)?.states ?? []
}

export function regionForState(uf: string): number | null {
  const found = CRN_REGIONS.find((r) => r.states.includes(uf.toUpperCase()))
  return found?.region ?? null
}

/**
 * Accepts the shapes people actually type: "CRN-3 12345", "crn3/12345", "CRN 3 · 12.345/D",
 * "3 12345 P". Returns null when it can't be read as a CRN at all.
 */
export function parseCrn(input: string): ParsedCrn | null {
  const raw = input.trim().toUpperCase()
  if (!raw) return null

  // region: leading "CRN" (optional) then 1-2 digits; then the registration number; then an
  // optional D/P/S kind. Separators are anything non-alphanumeric.
  const match = raw.match(/^(?:CRN)?[^0-9A-Z]*(\d{1,2})[^0-9A-Z]+([\d.\s]{3,})(?:[^0-9A-Z]*([DPS]))?$/)
  if (!match) return null

  const region = Number(match[1])
  const number = match[2].replace(/[^\d]/g, '')
  const kind = (match[3] as CrnKind | undefined) ?? 'D'

  if (!CRN_REGIONS.some((r) => r.region === region)) return null
  if (number.length < 3 || number.length > 7) return null

  return { region, number, kind, formatted: `CRN-${region} ${number}/${kind}` }
}

export interface CrnValidationError {
  error: string
}

/**
 * Full validation including the cross-check against the professional's state, which is the
 * part that actually catches fabricated numbers: someone in São Paulo claiming CRN-2 (Rio
 * Grande do Sul) is rejected immediately.
 *
 * `uf` is optional because the city field is free text — when we can't extract a state we
 * simply skip that check rather than blocking a legitimate registration.
 */
export function validateCrn(input: string, uf?: string | null): ParsedCrn | CrnValidationError {
  const parsed = parseCrn(input)
  if (!parsed) {
    return { error: 'CRN inválido. Use o formato CRN-3 12345 (regional de 1 a 11).' }
  }

  if (uf) {
    const expected = regionForState(uf)
    if (expected && expected !== parsed.region) {
      return {
        error: `CRN-${parsed.region} atende ${statesForRegion(parsed.region).join(', ')}. Para ${uf.toUpperCase()}, o conselho correto é o CRN-${expected}.`,
      }
    }
  }

  return parsed
}

const UF_LIST = CRN_REGIONS.flatMap((r) => r.states)

/** Pulls a state out of free-text city fields like "São Paulo, SP" or "Curitiba - PR". */
export function extractUf(city: string | null | undefined): string | null {
  if (!city) return null
  const match = city.toUpperCase().match(/(?:^|[^A-Z])([A-Z]{2})\s*$/)
  const uf = match?.[1]
  return uf && UF_LIST.includes(uf) ? uf : null
}

export function isCrnValidationError(v: ParsedCrn | CrnValidationError): v is CrnValidationError {
  return 'error' in v
}
