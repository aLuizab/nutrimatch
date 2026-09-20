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

## 3. Ligar a cobrança (link de pagamento + taxa de 10%)

Sem isso configurado o app funciona normalmente: as consultas seguem sendo combinadas
diretamente entre paciente e nutricionista, exatamente como antes. Você pode fazer esse passo
quando quiser.

Não há gateway nem cobrança automática. O caminho do dinheiro é um só, e tem duas pontas que
precisam existir **juntas** — faltando qualquer uma, a consulta é marcada sem cobrança:

1. **O link de cobrança**, que é como o paciente paga.
   Crie no InfinitePay um link com o valor do nutricionista e cole em
   **/admin/links-de-pagamento**.
2. **A chave Pix do nutricionista**, que é para onde os 90% voltam.
   Quem cadastra é ele, em **/configuracoes → Pagamentos**. Você não consegue cadastrar por
   ele de propósito: é a conta bancária dele, e um erro de digitação seu manda o dinheiro de
   outra pessoa para um desconhecido.

A tela de links mostra uma etiqueta vermelha **"Sem chave Pix"** em quem está pela metade.
Vale conferir ali antes de achar que a cobrança está no ar.

### O ciclo de uma consulta paga

1. O paciente escolhe o horário e envia o pedido.
2. Ele cai na tela de pagamento, com o link e um **contador de 30 minutos**.
3. Ele paga no InfinitePay e volta para clicar em **"já paguei"** — é esse clique que segura
   o horário. Sem ele, o contador zera e o agendamento é cancelado.
4. Você confere no extrato do InfinitePay e confirma em **/admin/financeiro**.
5. Só então o nutricionista recebe o pedido para aceitar, e o prazo de 24h dele começa.
6. Aceitando, paciente e nutricionista recebem a confirmação por e-mail.

Cobranças que o paciente **não** declarou também aparecem em /admin/financeiro, com um aviso
para você conferir o extrato — muita gente paga e não volta para avisar.

### A taxa de 10%

O dinheiro entra na conta da plataforma. Você repassa ao nutricionista o valor menos 10%,
por Pix, usando a chave dele. A fila de repasses pendentes fica em **/admin/financeiro**.

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

## Como o dinheiro circula

O pagamento é por **Pix**, e passa inteiro pela conta da plataforma:

1. O paciente agenda e vai para uma tela com o **Pix copia e cola** — já com o valor e um
   identificador próprio daquela cobrança.
2. Ele paga no app do banco e clica em "já fiz o pagamento". Isso é um aviso, não uma
   confirmação: chave Pix estática não avisa ninguém quando o dinheiro cai.
3. Em `/admin/financeiro` você confere a entrada no extrato (pelo valor e pelo identificador) e
   confirma. **Só nesse momento** o profissional é avisado da consulta e o prazo de 24h dele
   começa a contar.
4. A confirmação abre um **repasse** na mesma tela: o valor menos a taxa da plataforma, com a
   chave Pix do profissional ao lado para copiar. Você faz a transferência e marca como paga.

O nutricionista cadastra a chave dele em *Configurações → Pagamentos*. Sem chave cadastrada, ele
simplesmente não entra no fluxo pago e as consultas voltam a ser combinadas diretamente com o
paciente — nada quebra.

> **Por que manual:** uma chave Pix estática não tem webhook. Quando o volume não couber mais na
> conferência à mão, o caminho é integrar um PSP (Mercado Pago, Efí, Asaas), que emite QR
> dinâmico e confirma sozinho. O ponto de troca é `lib/pix-payments.ts`, e só ele.

## Antes de divulgar para nutricionistas de verdade

- [ ] Admin criado e testado (passo 1)
- [ ] Fluxo de aprovação testado com um cadastro real (passo 2)
- [x] Páginas de **termos**, **privacidade** e **política de cancelamento** publicadas, com a
      política visível antes do pagamento (CDC art. 46 e 49).
- [ ] **Revisão jurídica** dessas três páginas — o texto existe e descreve o funcionamento real,
      mas não passou por advogado. Dado de saúde é dado sensível pela LGPD. É o item mais
      importante desta lista.
- [ ] Nomear e publicar o encarregado de dados (DPO) em `/privacidade`.
- [ ] `PLATFORM_PIX_KEY` definida com a chave Pix real da plataforma (ver seção de pagamento).
- [ ] Um ciclo completo testado com dinheiro real e baixo valor: paciente paga → admin confere
      em `/admin/financeiro` → profissional confirma → repasse marcado como pago.
