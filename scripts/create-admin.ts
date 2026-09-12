// One-time bootstrap: creates a single ADMIN user, nothing else. Unlike prisma/seed.ts
// (dev/demo data — 8 fake professionals, wipes existing users), this is safe to run against a
// real database because it only ever adds one row and never deletes anything.
//
// Uso recomendado (o script pergunta o que falta, sem passar nada pelo shell):
//   npm run create-admin
//
// Também aceita argumentos e variáveis de ambiente — mas leia o aviso sobre senha abaixo:
//   npm run create-admin -- --email voce@exemplo.com --name "Seu Nome"
//   ADMIN_EMAIL=... ADMIN_NAME=... ADMIN_PASSWORD=... npx tsx scripts/create-admin.ts
//
// ⚠️  Por que a senha é perguntada e não passada por argumento: no PowerShell, "senha$2026"
// dentro de aspas duplas tem o $2026 expandido como variável ANTES de o Node ver o valor. Na
// melhor das hipóteses dá erro; na pior, o admin é criado com uma senha diferente da digitada e
// o login nunca funciona, sem nenhuma mensagem indicando o porquê. Perguntar aqui elimina o
// shell do caminho da senha.
import { createInterface } from 'readline'
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/password'

const prisma = new PrismaClient()

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(`--${flag}`)
  const value = i !== -1 ? process.argv[i + 1] : undefined
  // Um valor que começa com "--" é a próxima flag, não o valor: acontece quando o shell come o
  // argumento (senha com $ no PowerShell, por exemplo) e produziria um dado silenciosamente errado.
  return value?.startsWith('--') ? undefined : value
}

function interactive(): boolean {
  return process.stdin.isTTY === true
}

/**
 * UMA interface de readline para todas as perguntas. Abrir e fechar uma por pergunta perde
 * entrada: a primeira consome mais do stdin do que a linha que pediu, e a pergunta seguinte
 * fica esperando um dado que já foi engolido.
 */
const rl = createInterface({ input: process.stdin, output: process.stdout })

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())))
}

/**
 * Lê a senha sem mostrar na tela, lendo tecla a tecla em modo raw — o jeito padrão de fazer
 * isso sem biblioteca. Se o stdin não for um terminal de verdade (não tem setRawMode), cai para
 * a leitura normal: nesse caso a senha aparece, e é melhor aparecer do que o script travar.
 */
function askHidden(question: string): Promise<string> {
  const stdin = process.stdin
  if (typeof stdin.setRawMode !== 'function') return ask(question)

  return new Promise((resolve) => {
    process.stdout.write(question)
    // A interface de linha precisa sair do caminho enquanto lemos os bytes diretamente.
    rl.pause()
    const wasRaw = stdin.isRaw
    stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')

    let senha = ''
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === '\n' || ch === '\r' || ch === '\u0004') {
          stdin.removeListener('data', onData)
          stdin.setRawMode(wasRaw ?? false)
          stdin.pause()
          process.stdout.write('\n')
          rl.resume()
          resolve(senha)
          return
        }
        if (ch === '\u0003') {
          // Ctrl+C precisa continuar funcionando mesmo em modo raw.
          stdin.setRawMode(wasRaw ?? false)
          process.stdout.write('\n')
          process.exit(130)
        }
        if (ch === '\u007f' || ch === '\b') {
          senha = senha.slice(0, -1)
          continue
        }
        senha += ch
      }
    }
    stdin.on('data', onData)
  })
}

async function main() {
  let email = (arg('email') ?? process.env.ADMIN_EMAIL)?.trim().toLowerCase()
  let name = (arg('name') ?? process.env.ADMIN_NAME)?.trim()
  let password = arg('password') ?? process.env.ADMIN_PASSWORD

  if (!interactive() && (!email || !name || !password)) {
    console.error(
      'Faltam dados e o terminal não é interativo.\n' +
        'Rode "npm run create-admin" num terminal comum, ou defina ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD.'
    )
    process.exit(1)
  }

  if (!email) email = (await ask('E-mail do admin: ')).toLowerCase()
  if (!name) name = await ask('Nome: ')

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.log(`\nE-mail inválido: ${email}\n`)
    process.exit(1)
  }
  if (!name) {
    console.log('\nO nome não pode ficar vazio.\n')
    process.exit(1)
  }

  // Checado ANTES de pedir a senha: não faz sentido digitar duas vezes uma senha para descobrir
  // depois que a conta já existia.
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    // stdout, não stderr: é uma situação prevista, e no PowerShell tudo que vai para stderr vira
    // um bloco vermelho de NativeCommandError que parece uma quebra do script.
    console.log(`\nJá existe uma conta com o e-mail ${email} (papel: ${existing.role}). Nada foi criado.`)
    if (existing.role === 'ADMIN') {
      console.log('Esse admin já está pronto para uso — entre em /login com ele.')
      console.log('Esqueceu a senha? Use "Esqueci minha senha" na tela de login.\n')
    } else {
      console.log('Use outro e-mail: uma conta não pode ser paciente/profissional e admin ao mesmo tempo.\n')
    }
    process.exit(1)
  }

  if (!password) {
    password = await askHidden('Senha (mínimo 8 caracteres, não aparece na tela): ')
    const again = await askHidden('Repita a senha: ')
    if (password !== again) {
      console.log('\nAs senhas não conferem. Nada foi criado.\n')
      process.exit(1)
    }
  } else {
    // Veio pelo shell, então pode ter sido alterada no caminho. Mostrar o tamanho é o suficiente
    // para o usuário perceber a mutilação sem que a senha apareça na tela ou no histórico.
    console.log(`Senha recebida por argumento/variável: ${password.length} caracteres.`)
    console.log('Se esse número não bate com o que você digitou, o shell alterou a senha — rode')
    console.log('"npm run create-admin" sem o --password e digite quando for pedido.\n')
  }

  if (password.length < 8) {
    console.log('\nA senha precisa ter no mínimo 8 caracteres. Nada foi criado.\n')
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)
  await prisma.user.create({ data: { name, email, passwordHash, role: 'ADMIN' } })

  console.log(`\n✅ Admin criado com sucesso!\n`)
  console.log(`   E-mail: ${email}`)
  console.log(`   Nome:   ${name}`)
  console.log(`   Entre em /login e acesse /admin/profissionais para aprovar nutricionistas.\n`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    rl.close()
    await prisma.$disconnect()
  })
