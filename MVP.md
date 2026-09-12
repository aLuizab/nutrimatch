# Colocando o MVP para funcionar

Guia prático, na ordem em que as coisas precisam acontecer. Cada passo tem como conferir se
deu certo antes de seguir para o próximo.

---

## Antes de tudo: use o PowerShell, não o WSL

Este projeto está numa pasta do Windows (`C:\Users\...`), e o `node_modules` foi instalado pelo
Windows. Vários pacotes (esbuild, o compilador do Next, o engine do Prisma) trazem **binários
compilados por plataforma**, e só o binário do Windows está instalado.

Rodando pelo WSL, qualquer comando quebra com uma mensagem parecida com esta:

```
You installed esbuild for another platform than the one you're currently using.
Specifically the "@esbuild/win32-x64" package is present but this platform
needs the "@esbuild/linux-x64" package instead.
```

Não é erro do projeto: é o `node_modules` do Windows sendo lido pelo Linux. Como identificar
rapidamente — se o caminho no prompt começa com `/mnt/c/`, você está no WSL.

**Use o PowerShell** (ou o terminal do VS Code configurado para PowerShell) para tudo:
`npm run dev`, `npm run create-admin`, `npx prisma ...`.

> Se preferir trabalhar dentro do WSL, dá — mas aí o `node_modules` precisa ser reinstalado lá
> (`rm -rf node_modules && npm install` de dentro do WSL), e aí ele para de funcionar no
> Windows. Um `node_modules` não serve aos dois; escolha um lado e fique nele.

### Se o PowerShell recusar rodar o npm

Em muitas instalações do Windows a política de execução bloqueia scripts, e aparece isto:

```
npm : O arquivo C:\Program Files\nodejs\npm.ps1 não pode ser carregado porque a execução
de scripts foi desabilitada neste sistema.
```

O bloqueio é do wrapper `npm.ps1`. **Use `npm.cmd` no lugar de `npm`** e o problema some, sem
mexer em configuração nenhuma do sistema:

```powershell
npm.cmd run create-admin
npm.cmd run dev
npx.cmd prisma migrate deploy
```

Se preferir resolver de vez em vez de digitar `.cmd` toda vez, dá para liberar scripts assinados
só para o seu usuário — é uma mudança de segurança do seu Windows, então decida com calma:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

`RemoteSigned` permite scripts locais e exige assinatura só nos baixados da internet. Vale para o
seu usuário apenas, e dá para reverter com `Set-ExecutionPolicy -Scope CurrentUser Undefined`.

---

## 1. Criar seu usuário admin

O admin é quem aprova ou recusa cadastros de nutricionistas. Ele **não** pode ser criado pela
tela de cadastro (de propósito — senão qualquer pessoa viraria admin). Só por este comando:

```bash
npm run create-admin
```

O comando pergunta e-mail, nome e senha. **Digite a senha quando for pedido, não passe por
argumento** — a senha não aparece na tela e é pedida duas vezes para conferência.

Por que não passar a senha na linha de comando: no PowerShell, `"minhasenha$2026"` entre aspas
duplas tem o `$2026` expandido como variável **antes** de o comando receber o valor. Ou dá erro,
ou — pior — cria o admin com uma senha diferente da que você digitou, e aí o login nunca
funciona sem nenhuma pista do motivo. Perguntar a senha tira o shell do caminho.

Se preferir automatizar (CI, script de deploy), use variáveis de ambiente em vez de argumentos:

```bash
ADMIN_EMAIL=voce@exemplo.com ADMIN_NAME="Seu Nome" ADMIN_PASSWORD='sua-senha-forte' npx tsx scripts/create-admin.ts
```

**Conferindo:** entre em `/login` com esse e-mail e senha. Você deve cair em
`/admin/dashboard`.

**Erros comuns:**

| O que aparece | O que significa |
|---|---|
| `Já existe uma conta com o e-mail ... (papel: ADMIN)` | O admin já foi criado antes. Use ele, ou "Esqueci minha senha" se não lembrar. |
| `Já existe uma conta com o e-mail ... (papel: PATIENT)` | Esse e-mail já é de paciente ou profissional. Use outro — uma conta não acumula papéis. |
| `A variável '$...' não pode ser recuperada` | O PowerShell tentou expandir um `$` da sua senha. Rode `npm run create-admin` sem `--password`. |
| Criou, mas o login não aceita a senha | A senha foi alterada pelo shell no caminho. Apague o usuário e recrie com o modo interativo. |

> Rodando **em produção** (Railway), o comando é o mesmo:
> `railway run npm run create-admin`

---

## 2. Aprovar o cadastro de um nutricionista

Todo nutricionista que se cadastra entra como **PENDENTE** e não aparece em nenhuma busca até
você aprovar.

1. Entre como admin → menu **Profissionais** (`/admin/profissionais`).
   O topo mostra quantos estão aguardando aprovação.
2. Cada linha mostra o **CRN informado** (ex: `CRN-3 12345/D`).
3. Clique em **Conferir no CFN** — abre a
   [consulta pública do CFN](https://cfn.org.br/consulta-nacional-de-nutricionistas/) em outra aba.
4. Busque pelo nome ou pelo número e confira se bate: nome, número e situação ativa.
5. Voltando à NutriMatch: **Aprovar** (vira ATIVO e aparece nas buscas) ou **Suspender**.

Ao aprovar, o sistema registra **quem** aprovou e **quando** — aparece um selo verde ao lado
do CRN. Passar o mouse mostra quem conferiu.

### Sobre a validação de CRN

**Não existe API pública oficial de CRN.** O CFN disponibiliza apenas consulta via site. Então
a validação é feita em duas camadas:

**Automática (no cadastro, sem você fazer nada):**
- Formato: regional de 1 a 11, número de 3 a 7 dígitos, tipo D/P/S (definitivo, provisório,
  secundário).
- **Cruzamento regional × estado**: quem declara cidade em São Paulo e digita `CRN-2` (que é
  do Rio Grande do Sul) é barrado na hora, com a mensagem dizendo qual seria o conselho
  correto. Isso pega boa parte dos números inventados.
- Normalização: `crn3/12345`, `CRN 3 · 12.345` e `CRN-3 12345` viram todos `CRN-3 12345/D`.

**Manual (você, no passo 4 acima):** confirmação de que aquele número pertence mesmo àquela
pessoa. Só a consulta oficial responde isso.

Se um nutricionista já aprovado **trocar o CRN** depois, o perfil volta automaticamente para
PENDENTE e precisa de nova aprovação — senão daria para ser aprovado com um CRN real e trocar
por outro depois.

---

## 3. Conectar o Stripe (pagamentos + taxa de 10%)

Sem isso configurado, o app funciona normalmente: as consultas seguem sendo combinadas
diretamente entre paciente e nutricionista, exatamente como antes. Você pode fazer esse passo
quando quiser.

### 3.1 Criar a conta e pegar as chaves

1. Crie uma conta em [dashboard.stripe.com](https://dashboard.stripe.com/register).
2. Deixe o **modo de teste ligado** (chave no topo do painel) enquanto estiver testando.
3. Vá em **Desenvolvedores → Chaves de API** e copie a **Chave secreta** (`sk_test_...`).
4. No `.env`:
   ```
   STRIPE_SECRET_KEY="sk_test_..."
   PLATFORM_FEE_PERCENT="10"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   ```

### 3.2 Habilitar o Connect

Pagamentos de marketplace (você recebe, o nutricionista recebe, você retém 10%) usam o Stripe
Connect:

1. No painel do Stripe, vá em **Connect** → ative a plataforma.
2. Escolha **Express** como tipo de conta (é o que o código usa: o Stripe cuida da
   verificação de identidade, que no Brasil exige documento e selfie).
3. Preencha o perfil da plataforma (nome, site, descrição).

> ⚠️ **Confirme com o Stripe** se sua conta pode usar Connect com contas conectadas
> brasileiras e se o Pix está disponível. As regras mudam conforme o país da entidade da
> plataforma. Se algo aqui for negado, me avise que ajusto a integração.

### 3.3 Configurar os webhooks

São **dois** endpoints, com **segredos diferentes** — essa é a causa nº 1 de "assinatura
inválida":

**Em desenvolvimento**, instale a [Stripe CLI](https://stripe.com/docs/stripe-cli) e rode em
dois terminais separados:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
stripe listen --forward-connect-to localhost:3000/api/stripe/webhook/connect
```

Cada comando imprime um `whsec_...` diferente. Coloque no `.env`:
```
STRIPE_WEBHOOK_SECRET="whsec_..."          # do primeiro comando
STRIPE_CONNECT_WEBHOOK_SECRET="whsec_..."  # do segundo
```

**Em produção**, crie os dois endpoints em **Desenvolvedores → Webhooks**:

| Endpoint | Tipo | Eventos |
|---|---|---|
| `https://seudominio.com.br/api/stripe/webhook` | Conta da plataforma | `checkout.session.*`, `invoice.*` |
| `https://seudominio.com.br/api/stripe/webhook/connect` | **Contas conectadas** | `account.updated` |

Copie o segredo de cada um para a variável correspondente.

### 3.4 Nutricionista conecta a conta dele

1. Ele entra em **Configurações → Pagamentos**.
2. Vê quanto a plataforma retém (**10%**) **antes** de conectar.
3. Clica em **Conectar com Stripe** → é levado ao onboarding do Stripe (CPF/CNPJ, documento).
4. Ao voltar, o status aparece: conectado, pendências, ou ativo.

Na mesma aba tem o **simulador de repasse**: ele digita o valor da consulta e vê quanto fica
com ele. O simulador mostra só o que a NutriMatch retém — **não inventa** a taxa do Stripe,
que varia por conta e forma de pagamento, e aparece no extrato do próprio Stripe.

**Conferindo:** em modo de teste, use os dados de teste que o próprio Stripe sugere no
onboarding. Depois volte em Configurações → Pagamentos e clique em **Atualizar status**.

---

## 4. Testar o fluxo completo

Com o servidor rodando (`npm run dev`):

1. **Cadastro de paciente** — `/cadastro`, aba Paciente. Deve cair em `/patient/dashboard`.
2. **Cadastro de nutricionista** — `/cadastro`, aba Profissional.
   - Tente `CRN-2 12345` com cidade "São Paulo, SP" → deve **recusar** e dizer que o correto
     é CRN-3.
   - Corrija para `CRN-3 12345` → deve aceitar e mostrar o aviso de perfil em análise.
3. **Aprovação** — entre como admin, confira no CFN, aprove.
4. **Busca** — em `/resultados`, o nutricionista recém-aprovado agora aparece.
5. **Agendamento** — como paciente, agende uma consulta com ele.
6. **Cancelamento e reagendamento** — cancele e tente marcar o **mesmo horário** de novo.
   Deve funcionar (esse era um bug: o horário ficava travado para sempre).

---

## Contas de demonstração

O `npm run seed` cria dados fictícios para você navegar. **Todas as senhas: `senha123`.**

| Papel | E-mail |
|---|---|
| Admin | admin@nutrimatch.com.br |
| Nutricionista | carolina@nutrimatch.com.br |
| Paciente | ana@email.com |

⚠️ Esses dados são de demonstração. **Nunca rode o seed contra o banco de produção** — ele
apaga todos os usuários. O script se recusa a rodar com `NODE_ENV=production`.

---

## Antes de divulgar para nutricionistas de verdade

- [ ] Admin criado e testado (passo 1)
- [ ] Fluxo de aprovação testado com um cadastro real (passo 2)
- [ ] **Política de privacidade e termos de uso** — hoje os links no cadastro não levam a
      lugar nenhum. Dado de saúde é dado sensível pela LGPD, e cobrar pagamento sem termos
      publicados é exposição jurídica. É o item mais importante desta lista.
- [ ] Se for cobrar: política de cancelamento e reembolso visível **antes** do pagamento
      (exigência do CDC, art. 46 e 49).
- [ ] Stripe em modo **produção** (chaves `sk_live_`) e webhooks apontando para o domínio real.
