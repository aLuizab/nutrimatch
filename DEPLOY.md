# Deploy: Railway + Postgres + domínio .com.br

Passo a passo específico para colocar o NutriMatch em produção. Custo estimado total:
~R$30-80/mês (Railway uso baixo + domínio .com.br a R$40/ano).

## 1. Banco de dados de desenvolvimento (Neon, grátis)

O banco local não pode mais ser SQLite (o schema agora usa `postgresql`). Para desenvolver:

1. Crie uma conta grátis em https://neon.tech
2. Crie um projeto (qualquer nome, região `sa-east-1`/São Paulo se disponível)
3. Copie a "Connection string" (formato `postgresql://user:pass@host/db?sslmode=require`)
4. Cole no `.env` local como `DATABASE_URL`
5. Rode:
   ```
   npx prisma migrate dev --name init
   npm run dev
   ```
   Isso cria as tabelas no Neon e popula com dados de demonstração (`prisma/seed.ts`).

Esse banco do Neon é só para desenvolvimento — nunca aponte para ele a partir de produção, e
vice-versa.

## 2. Subir o código para o GitHub

O Railway faz deploy automático a partir de um repositório. Se o projeto ainda não tem um
remoto no GitHub, criar um repositório novo e dar `git push`.

## 3. Railway

1. Crie uma conta em https://railway.app (aceita login com GitHub)
2. **New Project → Deploy from GitHub repo** → selecione o repositório. O Railway detecta o
   `Dockerfile` na raiz automaticamente e usa ele para o build (nenhuma configuração extra
   necessária — o Dockerfile já roda `prisma migrate deploy` antes de iniciar o servidor).
3. No mesmo projeto, **New → Database → Add PostgreSQL** (um clique, o Railway provisiona e
   expõe a connection string automaticamente).
4. No serviço da aplicação (não no banco) → **Variables**, adicione:
   - `DATABASE_URL` → referencie a variável do plugin Postgres (`${{Postgres.DATABASE_URL}}` no
     seletor de referência do Railway, ou cole o valor direto)
   - `JWT_SECRET` → gere um valor novo e forte (**não reaproveite** o que está no `.env` local
     hoje — ele já apareceu em texto simples numa sessão de trabalho e deve ser tratado como
     comprometido). Pode gerar um com `openssl rand -base64 48` ou qualquer gerador de senha
     forte de 40+ caracteres.
   - `NODE_ENV` → `production` (o Railway costuma setar isso automaticamente, mas confirme)
5. Deploy. Acompanhe os logs — a primeira execução do `CMD` do Dockerfile roda
   `prisma migrate deploy`, que cria as tabelas no Postgres do Railway do zero.

## 4. Domínio (.com.br via Registro.br)

1. Registre o domínio escolhido em https://registro.br (R$40/ano; precisa de CPF ou CNPJ)
2. No Railway, vá no serviço da aplicação → **Settings → Networking → Custom Domain**, adicione
   o domínio. O Railway mostra um alvo CNAME (algo como `xxxx.up.railway.app`).
3. No painel do Registro.br (Meus Domínios → DNS), adicione um registro CNAME apontando o
   domínio (ou o subdomínio `www`) para o alvo que o Railway forneceu.
4. Aguarde a propagação de DNS (pode levar de minutos a algumas horas) e confirme que o
   domínio abre com HTTPS válido (o Railway emite o certificado automaticamente depois que o
   DNS resolve corretamente).

## 5. Criar a conta de administrador real

**Não rode `prisma/seed.ts` em produção** — ele apaga todos os usuários e cria 8 profissionais
fictícios, que não devem aparecer para pacientes reais. Em vez disso, rode o script de bootstrap
uma única vez, direto contra o banco de produção:

```
railway run --service <nome-do-serviço> npm run create-admin
```

O comando pergunta e-mail, nome e senha. **Deixe ele perguntar a senha** em vez de passá-la por
argumento: no PowerShell um `$` dentro de aspas duplas é expandido como variável antes de o
comando ver o valor, o que cria o admin com uma senha diferente da digitada — e o login falha
depois, sem pista nenhuma do motivo.

Para automatizar, use as variáveis `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_PASSWORD` (com aspas
**simples** na senha) em vez de argumentos.

Depois disso, faça login em `https://seudominio.com.br/login` com essa conta — é o ponto de
partida para aprovar nutricionistas reais em `/admin/profissionais`.

## 6. Criar os planos de assinatura

Os dois planos (Gratuito e Profissional) são linhas no banco, não constantes no código. Crie-as
uma vez por ambiente — o script é idempotente e pode rodar em todo deploy:

```
railway run --service <nome-do-serviço> npm run ensure-plans
```

Ele também coloca no plano gratuito qualquer profissional que ainda não tenha assinatura.

### Ligar a cobrança da assinatura (opcional)

1. No painel do Stripe, crie um **produto recorrente** ("NutriMatch Profissional", mensal) e
   copie o id do preço (`price_...`).
2. Grave o id na linha do plano:
   ```sql
   UPDATE "SubscriptionPlan" SET "stripePriceId" = 'price_...' WHERE slug = 'profissional';
   ```
3. Crie um endpoint de webhook da **plataforma** (não do Connect) apontando para
   `https://seudominio.com.br/api/stripe/webhook/platform` — o mesmo endpoint que trata
   consultas e pacotes, detalhado na seção 8. Copie o signing secret para
   `STRIPE_WEBHOOK_SECRET`.

**`SUBSCRIPTION_ENFORCED_FROM` decide quando a assinatura passa a ser obrigatória.** Enquanto
estiver vazia, todo profissional continua recebendo agendamentos independente do plano — que é
o comportamento certo enquanto você ainda está trazendo os primeiros nutricionistas. Ao definir
uma data, a partir dela quem estiver no plano gratuito **para de receber agendamentos**. Avise
antes de definir.

## 7. Agendador de lembretes

Os lembretes (véspera da consulta e cobrança de confirmação pendente) rodam por chamada externa,
não por processo de fundo.

1. Gere um segredo e grave em `CRON_SECRET`:
   ```
   openssl rand -hex 32
   ```
   Sem essa variável a rota responde 503 e não envia nada — é o padrão seguro, já que uma rota
   aberta aqui dispararia e-mail para todas as consultas futuras.
2. No Railway, crie um **cron job** chamando a rota a cada 6 horas:
   ```
   curl -fsS -X POST https://seudominio.com.br/api/cron/reminders \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

3. Crie um **segundo cron, diário**, para acertar os pacotes vencidos — é o que devolve o valor
   das consultas não usadas. Fica separado dos lembretes porque mexe em dinheiro, e um job de
   estorno escondido dentro de uma rota chamada "reminders" é o tipo de coisa que ninguém acha
   quando precisa:
   ```
   curl -fsS -X POST https://seudominio.com.br/api/cron/settlements \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

Rodar duas vezes seguidas não duplica e-mail: cada lembrete é registrado antes do envio na
tabela `SentReminder`, e a segunda execução pula o que já saiu. O mesmo vale para os estornos:
`refundedAt` marca o pacote já acertado.

## 8. Pagamento das consultas e dos pacotes (Pix)

**O modelo atual é Pix com conferência manual.** O paciente paga na chave da plataforma, e a
plataforma repassa ao profissional descontada a taxa. Configure:

```
PLATFORM_PIX_KEY="sua-chave-pix"
PLATFORM_PIX_NAME="NutriMatch"
PLATFORM_PIX_CITY="Sao Paulo"
```

Sem `PLATFORM_PIX_KEY` nenhuma cobrança é gerada e o app funciona como antes de existir
pagamento. A operação do dia a dia acontece em `/admin/financeiro`: fila de pagamentos a
conferir e fila de repasses a pagar.

Chave Pix estática **não emite webhook** — por isso a conferência é humana. O BR Code gerado
(`lib/pix.ts`) carrega valor e identificador justamente para tornar essa conferência viável no
extrato.

### Stripe (dormente)

O código do Stripe continua no repositório mas **não é usado**: nenhuma conta foi conectada e
nenhum pagamento passou por ele. Deixe `STRIPE_SECRET_KEY` vazia. O texto abaixo descreve como
aquele modelo funcionava, caso um dia valha religar.

## 8b. Modelo antigo, via Stripe (referência)

O dinheiro passa pela plataforma como **destination charge**: o paciente paga o total, a
NutriMatch retém `PLATFORM_FEE_PERCENT` e o restante vai para a conta conectada do profissional.
Duas formas de pagamento no checkout: **cartão e Pix**.

**Consulta avulsa — autoriza no agendamento, cobra na confirmação (só no cartão).** O cartão é
autorizado com `capture_method: manual` quando o paciente agenda, e só é capturado quando o
profissional confirma. Se ele recusar ou deixar vencer o prazo de 24h, a autorização é
cancelada: nada é cobrado e não existe estorno para o paciente esperar. Enquanto o checkout está
aberto o horário fica preso por ~20 minutos apenas — carrinho abandonado não pode bloquear a
agenda de ninguém.

Pix não tem captura manual — a Stripe cobra na hora, no instante em que o paciente confirma no
app do banco. Uma consulta paga por Pix então vai direto para `PAID` (não `AUTHORIZED`), antes
de qualquer decisão do profissional. Se ele recusar ou o paciente cancelar antes da confirmação,
o valor volta por **estorno** em vez de cancelamento de autorização — mesmo resultado (o
paciente não fica no prejuízo por uma decisão que não foi dele), caminho diferente no Stripe. Ver
`refundUnconfirmedAppointmentPayment` em `lib/payments.ts`. Isso cobre o caso em que o
profissional nunca confirmou a consulta.

**Consulta já confirmada.** O paciente cancela com `CANCEL_REFUND_CUTOFF_HOURS` (12h) de
antecedência ou mais → reembolso integral automático
(`refundConfirmedAppointmentCancellation`). Com menos de 12h, o cancelamento é aceito mas sem
devolução — a alternativa é **remarcar**, disponível até `RESCHEDULE_CUTOFF_HOURS` (5h) antes do
horário original, que só move `scheduledAt`/`slotHeldAt` sem tocar em pagamento nem exigir nova
confirmação do profissional. Se é o **profissional** que cancela uma consulta já confirmada, o
reembolso é sempre integral, sem janela — quem decidiu não foi o paciente. Constantes e janelas em
`lib/appointment-status.ts`.

**Pacote de 3 ou 6 meses — cobra tudo de uma vez, em cartão ou Pix.** O paciente compra e depois
marca as consultas ao longo do período, sem pagar de novo a cada uma. No fim do prazo, o cron de
`settlements` devolve o valor proporcional das consultas não usadas, estornando junto a taxa da
plataforma na mesma proporção — a NutriMatch não fica com comissão de consulta que não houve.
Aqui não existe o conflito de captura do parágrafo acima: o pacote já é cobrado na hora em
qualquer forma de pagamento.

### Ativar o Pix na conta Stripe

Pix não vem ligado por padrão. Em **cada ambiente** (modo teste e modo produção são contas
separadas do ponto de vista de configuração):

1. No [Dashboard da Stripe](https://dashboard.stripe.com/settings/payment_methods), confirme que
   está no modo certo (o toggle "Test mode" no canto), e ative **Pix** na lista de formas de
   pagamento.
2. Sem isso, a criação do checkout falha com `The payment method type provided: pix is invalid`
   — não tem relação com captura manual nem com a conta conectada do profissional, é só essa
   chave estar desligada.

### Testando com valor mínimo

Não dá para testar com centavos: os campos de preço (`Professional.price`,
`CarePlan.pricePerConsultation`) guardam reais inteiros no banco (ver o comentário em
`lib/money.ts` sobre por quê), e o Pix em si tem piso de **R$ 0,50** por transação — então
**R$ 1** é o menor valor que dá pra usar de ponta a ponta. Para testar:

- Edite o preço de um profissional de teste para `1` em `/configuracoes` (o formulário de
  cadastro sugere um mínimo de R$50, mas a validação de verdade, no servidor, só exige `>= 1`).
- Para testar um pacote, o preço avulso do profissional precisa ficar **acima** do
  `pricePerConsultation` do programa (é a regra que garante que o pacote seja mais barato que a
  consulta avulsa) — ajuste o preço avulso para `2` antes de criar um programa a `1`.

### Rodando o teste de ponta a ponta

1. Ative o Pix (seção acima).
2. `stripe listen --forward-to localhost:3000/api/stripe/webhook/platform` — copie o
   `whsec_...` que ele imprime para `STRIPE_WEBHOOK_SECRET` no `.env` e reinicie o `npm run dev`
   (instale a CLI com `npm install -g @stripe/cli` se ainda não tiver).
3. Como profissional de teste, conecte o Stripe em `/configuracoes` (aba Pagamentos) e complete
   o onboarding — em modo teste o próprio formulário da Stripe costuma oferecer dados de teste
   prontos para preencher.
4. Ajuste os preços para R$1 (seção acima).
5. Como paciente, agende uma consulta (ou compre um programa) com esse profissional — o app leva
   direto para o checkout da Stripe com o valor certo.
6. No checkout, teste os dois caminhos (em execuções separadas):
   - **Cartão**: `4242 4242 4242 4242`, validade/CVC/CEP quaisquer.
   - **Pix**: em modo teste a Stripe mostra um botão para simular o pagamento em vez de um QR
     code real (não existe banco de verdade em modo teste).
7. Confirme no terminal onde `stripe listen` está rodando que o evento
   `checkout.session.completed` chegou, e no painel da Stripe
   (`dashboard.stripe.com/test/payments`) que a consulta em cartão aparece como **autorizada,
   não capturada** enquanto a de Pix aparece como **paga na hora**.
8. Como o profissional, confirme a consulta paga em cartão em `/agenda` — no painel da Stripe
   ela deve virar **capturada** nesse momento. Para a de Pix, confirmar não deve gerar nenhuma
   cobrança nova (já estava paga).
9. Para testar a devolução: agende de novo, pague por Pix, e desta vez **recuse** a consulta
   como profissional (ou cancele como paciente antes da confirmação) — confira no painel da
   Stripe que um estorno foi criado e que `paymentStatus` virou `REFUNDED` no banco.

### Webhook da plataforma

Um endpoint só, em `/api/stripe/webhook/platform`, ouvindo:

- `checkout.session.completed` e `checkout.session.expired` — consultas e pacotes
- `customer.subscription.*` e `invoice.payment_*` — assinatura do nutricionista

O endpoint do **Connect** (`/api/stripe/webhook/connect`, eventos `account.*`) continua separado,
com o seu próprio signing secret.

### Conta conectada do profissional (Accounts v2)

O onboarding usa a API **Accounts v2** (`/v2/core/accounts`). O Stripe passou a recusar a criação
de contas v1 em integrações novas, então a versão anterior deste código não conseguia mais
conectar nutricionista nenhum. Não há nada a configurar por causa disso — só vale saber, porque
a documentação de Connect que circula por aí ainda mostra a v1.

### Sem Stripe configurado

Sem `STRIPE_SECRET_KEY`, ou com um profissional que não concluiu o onboarding, o app funciona
exatamente como antes de existir pagamento: a consulta é agendada e o valor é combinado direto
entre paciente e profissional. Não é um modo degradado — é o caminho normal de quem ainda não
conectou a conta.

## Checklist antes de divulgar o link

- [ ] Segundo deploy testado (um commit trivial) — confirma que os dados persistem entre deploys
- [ ] Login/cadastro funcionando no domínio novo, cookie de sessão com `Secure` (checar no
      DevTools do navegador)
- [ ] Conta de admin criada e testada
- [ ] `npm run ensure-plans` rodado (sem ele, nenhum profissional tem plano)
- [ ] `CRON_SECRET` definido e o cron de lembretes agendado
- [ ] `SUBSCRIPTION_ENFORCED_FROM` **vazia** no lançamento — ligue só quando for cobrar mesmo
- [ ] Webhook da plataforma criado e testado
      (`stripe listen --forward-to localhost:3000/api/stripe/webhook/platform`)
- [ ] Cron de `settlements` agendado — sem ele ninguém recebe a devolução do pacote
- [ ] Pix ativado no Dashboard da Stripe (Configurações → Métodos de pagamento) — não vem ligado
      por padrão, e é uma conta separada por modo teste/produção
- [ ] Consulta e pacote pagos de ponta a ponta em modo teste, nos dois métodos — ver o roteiro
      completo em "Rodando o teste de ponta a ponta" acima:
  - [ ] Cartão: agendar → pagar → confirmar, conferindo no painel do Stripe que a autorização
        virou captura e que o repasse saiu
  - [ ] Pix: agendar → pagar → confirmar, conferindo que a cobrança já aparece paga antes da
        confirmação e que o repasse saiu igual
  - [ ] Pix: agendar → pagar → **recusar**, conferindo que o estorno aparece no painel do Stripe
        e que `paymentStatus` virou `REFUNDED`
- [ ] **Revisão jurídica de `/termos`, `/privacidade` e `/politica-de-cancelamento`** — as três
      páginas existem e os links no cadastro já apontam para elas, mas o conteúdo é um rascunho
      escrito a partir do funcionamento real da plataforma, não uma revisão de advogado. Dado de
      saúde é dado sensível pela LGPD; publicar sem essa revisão não é recomendado.
  - [ ] Nomear e publicar o encarregado de dados (DPO) real em `/privacidade` — hoje está marcado
        como pendente.
