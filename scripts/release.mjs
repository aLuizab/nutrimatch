#!/usr/bin/env node
// Publica uma versão: move o "Não lançado" do CHANGELOG para uma seção datada,
// atualiza o package.json, commita e cria a tag.
//
//   npm run release -- minor          (ou major, patch, ou 1.2.3)
//   npm run release -- minor --dry    mostra o que faria, sem escrever nada
//
// As checagens antes de escrever qualquer coisa não são burocracia: uma tag
// aponta para um commit para sempre, e corrigir uma tag já publicada é pior do
// que qualquer aviso que este script possa dar.
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const dry = args.includes('--dry')
const alvo = args.find((a) => !a.startsWith('--'))

function sair(msg) {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
}

if (!alvo) {
  sair('Informe major, minor, patch ou um número exato.\n  npm run release -- minor')
}

// ── checagens ──────────────────────────────────────────────────────────────
const branch = git('rev-parse --abbrev-ref HEAD')
if (branch !== 'main') {
  sair(`Release sai de main, e você está em "${branch}".\n  Abra o PR de staging para main primeiro.`)
}

if (git('status --porcelain')) {
  sair('Há alterações não commitadas. Uma tag precisa apontar para um estado conhecido.')
}

// Sem isso, a tag local aponta para um commit que ninguém mais tem.
git('fetch origin main --quiet')
const atras = git('rev-list --count HEAD..origin/main')
if (atras !== '0') {
  sair(`Sua main está ${atras} commit(s) atrás de origin/main. Rode: git pull`)
}

// ── versão ─────────────────────────────────────────────────────────────────
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const [maj, min, pat] = pkg.version.split('.').map(Number)
const nova =
  alvo === 'major' ? `${maj + 1}.0.0`
  : alvo === 'minor' ? `${maj}.${min + 1}.0`
  : alvo === 'patch' ? `${maj}.${min}.${pat + 1}`
  : alvo

if (!/^\d+\.\d+\.\d+$/.test(nova)) sair(`"${alvo}" não é major, minor, patch nem um número X.Y.Z.`)

const tags = git('tag').split('\n').filter(Boolean)
if (tags.includes(`v${nova}`)) sair(`A tag v${nova} já existe.`)

// ── changelog ──────────────────────────────────────────────────────────────
const CHANGELOG = 'CHANGELOG.md'
const changelog = readFileSync(CHANGELOG, 'utf8')
const marcador = '## [Não lançado]'
const i = changelog.indexOf(marcador)
if (i < 0) sair(`Não encontrei "${marcador}" no ${CHANGELOG}.`)

const depois = changelog.indexOf('\n## [', i + marcador.length)
const corpo = changelog
  .slice(i + marcador.length, depois < 0 ? undefined : depois)
  .replace(/<!--[\s\S]*?-->/g, '')
  .trim()

if (!corpo) {
  sair(
    `"Não lançado" está vazio no ${CHANGELOG}.\n` +
      '  Um release sem nota de release é um release que ninguém consegue auditar depois.'
  )
}

const hoje = new Date().toISOString().slice(0, 10)
const novoChangelog =
  changelog.slice(0, i) +
  `${marcador}\n\n<!-- Entradas novas entram aqui. No release, viram uma seção com número e data. -->\n\n` +
  `## [${nova}] — ${hoje}\n\n${corpo}\n` +
  (depois < 0 ? '' : changelog.slice(depois))

console.log(`\n  ${pkg.version} → ${nova}   (tag v${nova}, ${hoje})\n`)
console.log(corpo.split('\n').map((l) => '  │ ' + l).join('\n'))

if (dry) {
  console.log('\n  --dry: nada foi escrito.\n')
  process.exit(0)
}

pkg.version = nova
writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
writeFileSync(CHANGELOG, novoChangelog)

execSync(`git add package.json ${CHANGELOG}`)
execSync(`git commit -m "Release v${nova}"`)
execSync(`git tag -a v${nova} -m "v${nova}"`)

console.log(`\n✔ Commit e tag v${nova} criados.\n\n  Agora: git push --follow-tags\n`)
