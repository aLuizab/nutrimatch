#!/usr/bin/env node
// Local pre-commit guard. Not a replacement for gitleaks in CI — it's the fast, dependency-free
// check that catches the realistic accident (committing .env, or pasting a live key into a
// source file) before it ever reaches the remote, where a secret must be treated as burned
// even if the commit is later removed.
import { execSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const PATTERNS = [
  { name: 'Stripe secret key', re: /sk_(live|test)_[A-Za-z0-9]{16,}/ },
  { name: 'Stripe webhook secret', re: /whsec_[A-Za-z0-9]{16,}/ },
  { name: 'Postgres URL com senha', re: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s:@]+@[^\s/]+/ },
  { name: 'Chave privada', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'Resend API key', re: /re_[A-Za-z0-9]{16,}/ },
]

// Os mesmos placeholders que o .gitleaks.toml libera — as duas listas precisam continuar
// iguais. Param no host de propósito: o padrão acima termina em [^s/]+ e não captura o nome
// do banco, então listar o valor completo aqui faria a comparação falhar sempre que o trecho
// aparecer citado (numa aspas, num comentário) em vez de isolado.
const ALLOWED = [
  'postgres://build:build@localhost',
  'postgresql://build:build@localhost',
  'postgres://ci:ci@localhost',
  'postgresql://ci:ci@localhost',
  'postgres://user:password@host',
  'postgresql://user:password@host',
  'sk_test_...',
  'sk_live_...',
  'whsec_...',
]

const DOC_FILES = /\.(md)$/i

function staged() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' })
  return out.split('\n').map((s) => s.trim()).filter(Boolean)
}

const files = staged()
const problems = []

for (const file of files) {
  // .env must never be committed, whatever its contents.
  if (/(^|\/)\.env(\.|$)/.test(file) && !file.endsWith('.example')) {
    problems.push(`${file}: arquivo .env não deve ser commitado`)
    continue
  }
  if (DOC_FILES.test(file)) continue

  let content
  try {
    if (statSync(file).size > 2_000_000) continue
    content = readFileSync(file, 'utf8')
  } catch {
    continue
  }

  for (const { name, re } of PATTERNS) {
    const match = content.match(re)
    if (match && !ALLOWED.some((a) => match[0].includes(a) || a.includes(match[0]))) {
      problems.push(`${file}: possível ${name} (${match[0].slice(0, 24)}...)`)
    }
  }
}

if (problems.length > 0) {
  console.error('\n❌ Commit bloqueado — possível credencial detectada:\n')
  for (const p of problems) console.error(`   ${p}`)
  console.error('\nRemova o segredo e use variáveis de ambiente. Se for falso positivo,')
  console.error('adicione o placeholder à lista ALLOWED em scripts/check-secrets.mjs.')
  console.error('Para pular (não recomendado): git commit --no-verify\n')
  process.exit(1)
}
