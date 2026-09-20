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

### Ligar a cobrança da mensalidade

A mensalidade é paga por **link do InfinitePay**, como todo o resto do dinheiro nesta
plataforma — não há cobrança recorrente automática em lugar nenhum.

1. Crie no InfinitePay um link com o valor da mensalidade (R$ 9,90).
2. Entre como admin em **/admin/links-de-pagamento** e cole o link no bloco
   **Mensalidade da plataforma**, no topo da página.
3. A partir daí o nutricionista vê o botão de pagar em **/assinatura**.
4. Quando ele pagar, confira no extrato do InfinitePay e registre em
   **/admin/profissionais** → o profissional → registrar mensalidade. É isso que grava
   `currentPeriodEnd`, que é o que decide se ele aparece na busca.

Sem o link cadastrado o nutricionista não tem como pagar sozinho, e só resta você registrar
o pagamento à mão depois de combinar por fora.
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

## Checklist antes de divulgar o link

- [ ] Segundo deploy testado (um commit trivial) — confirma que os dados persistem entre deploys
- [ ] Login/cadastro funcionando no domínio novo, cookie de sessão com `Secure` (checar no
      DevTools do navegador)
- [ ] Conta de admin criada e testada
- [ ] `npm run ensure-plans` rodado (sem ele, nenhum profissional tem plano)
- [ ] `CRON_SECRET` definido e o cron de lembretes agendado
- [ ] `SUBSCRIPTION_ENFORCED_FROM` **vazia** no lançamento — ligue só quando for cobrar mesmo
- [ ] Webhook da plataforma criado e testado
- [ ] Cron de `settlements` agendado — sem ele ninguém recebe a devolução do pacote
      por padrão, e é uma conta separada por modo teste/produção
- [ ] Consulta e pacote pagos de ponta a ponta em modo teste, nos dois métodos — ver o roteiro
      completo em "Rodando o teste de ponta a ponta" acima:
  - [ ] Agendar → pagar no link → avisar que pagou → confirmar em /admin/financeiro, conferindo
        virou captura e que o repasse saiu
  - [ ] Pix: agendar → pagar → confirmar, conferindo que a cobrança já aparece paga antes da
        confirmação e que o repasse saiu igual
  - [ ] Agendar → pagar → **recusar** em /admin/financeiro, conferindo que o paciente é avisado
        e que `paymentStatus` virou `REFUNDED`
- [ ] **Revisão jurídica de `/termos`, `/privacidade` e `/politica-de-cancelamento`** — as três
      páginas existem e os links no cadastro já apontam para elas, mas o conteúdo é um rascunho
      escrito a partir do funcionamento real da plataforma, não uma revisão de advogado. Dado de
      saúde é dado sensível pela LGPD; publicar sem essa revisão não é recomendado.
  - [ ] Nomear e publicar o encarregado de dados (DPO) real em `/privacidade` — hoje está marcado
        como pendente.
