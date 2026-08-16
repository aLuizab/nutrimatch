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

com as variáveis de ambiente `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_PASSWORD` (senha forte)
definidas antes do comando (ou passadas inline). Depois disso, faça login em
`https://seudominio.com.br/login` com essa conta — é o ponto de partida para aprovar
nutricionistas reais em `/admin/profissionais`.

## Checklist antes de divulgar o link

- [ ] Segundo deploy testado (um commit trivial) — confirma que os dados persistem entre deploys
- [ ] Login/cadastro funcionando no domínio novo, cookie de sessão com `Secure` (checar no
      DevTools do navegador)
- [ ] Conta de admin criada e testada
- [ ] **Política de privacidade e termos de uso reais** — os links no cadastro hoje não levam a
      lugar nenhum. Dado de saúde é dado sensível pela LGPD; resolver isso antes de divulgar
      publicamente é fortemente recomendado (frente separada deste deploy).
