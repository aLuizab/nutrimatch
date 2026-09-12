#!/usr/bin/env node
// Dependency vulnerability gate.
//
// Plain `npm audit --audit-level=high` currently fails on advisories that cannot be fixed
// without a Next.js major upgrade, and a gate that always fails is a gate everyone learns to
// ignore. So: fail on anything high/critical EXCEPT explicitly listed exceptions, each with a
// stated reason and a review date. Anything new still breaks the build.
import { execSync } from 'node:child_process'

const EXCEPTIONS = [
  {
    advisory: 'GHSA-r28c-9q8g-f849',
    package: 'postcss',
    reason:
      'postcss is bundled inside next@15 and cannot be overridden. The flaw is path traversal ' +
      'via sourceMappingURL during CSS processing — build-time only, over our own stylesheets. ' +
      'Not reachable from a request. Resolved by upgrading to next@16.',
    reviewBy: '2026-12-01',
  },
  {
    advisory: 'GHSA-6g55-p6wh-862q',
    package: 'postcss',
    reason: 'Same bundled postcss, same build-time-only reachability.',
    reviewBy: '2026-12-01',
  },
  {
    advisory: 'GHSA-fxqj-rqcc-2cmp',
    package: 'postcss',
    reason: 'Same bundled postcss, same build-time-only reachability.',
    reviewBy: '2026-12-01',
  },
  {
    advisory: 'GHSA-qx2v-qp2m-jg93',
    package: 'postcss',
    reason: 'Same bundled postcss. XSS via unescaped </style> in stringify output; we do not ' +
      'process untrusted CSS.',
    reviewBy: '2026-12-01',
  },
]

const today = new Date().toISOString().slice(0, 10)
const expired = EXCEPTIONS.filter((e) => e.reviewBy < today)
if (expired.length > 0) {
  console.error('\n❌ Exceções de vulnerabilidade vencidas — revise antes de continuar:\n')
  for (const e of expired) console.error(`   ${e.advisory} (${e.package}) venceu em ${e.reviewBy}`)
  process.exit(1)
}

let report
try {
  report = JSON.parse(execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
} catch (e) {
  // npm audit exits non-zero when it finds anything; the JSON still comes out on stdout.
  try {
    report = JSON.parse(e.stdout)
  } catch {
    console.error('Não foi possível ler a saída do npm audit')
    process.exit(1)
  }
}

const allowed = new Set(EXCEPTIONS.map((e) => e.advisory))
const blocking = []

for (const [name, vuln] of Object.entries(report.vulnerabilities ?? {})) {
  if (!['high', 'critical'].includes(vuln.severity)) continue
  const advisories = (vuln.via ?? []).filter((v) => typeof v === 'object')
  // A package whose findings are all excepted (or which is only vulnerable transitively via
  // an excepted package) doesn't block.
  const unexcused = advisories.filter((a) => !allowed.has(a.url?.split('/').pop() ?? ''))
  if (advisories.length > 0 && unexcused.length === 0) continue
  if (advisories.length === 0) continue
  blocking.push({ name, severity: vuln.severity, advisories: unexcused.map((a) => a.title) })
}

if (blocking.length > 0) {
  console.error('\n❌ Vulnerabilidades high/critical sem exceção registrada:\n')
  for (const b of blocking) {
    console.error(`   ${b.name} (${b.severity})`)
    for (const t of b.advisories) console.error(`     - ${t}`)
  }
  console.error('\nCorrija com `npm audit fix`, ou registre uma exceção justificada em')
  console.error('scripts/audit-gate.mjs se for comprovadamente inalcançável.\n')
  process.exit(1)
}

const counts = report.metadata?.vulnerabilities ?? {}
console.log(
  `✅ Sem vulnerabilidades high/critical bloqueantes ` +
    `(${EXCEPTIONS.length} exceção(ões) registrada(s); total reportado: ${JSON.stringify(counts)})`
)
