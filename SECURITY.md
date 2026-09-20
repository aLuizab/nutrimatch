# Segurança

Como os secrets são guardados, como rotacioná-los, e quais barreiras existem hoje.

---

## 1. Onde ficam os secrets

| Ambiente | Onde | Como |
|---|---|---|
| Local | `.env` | Nunca commitado (`.gitignore`), nunca vai para a imagem Docker (`.dockerignore`) |
| Produção | Variáveis do Railway | Criptografadas pelo Railway; não tocam disco nem repositório |
| CI | Placeholders | O CI **nunca** recebe credencial real — usa valores falsos só para compilar |

Secrets em uso: `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`.

O app **recusa iniciar** com `JWT_SECRET` curto (<32 caracteres) ou com valor de exemplo
(`lib/env.ts`) — melhor quebrar no boot do que rodar assinando tokens forjáveis.

---

## 2. Rotação

### Regra geral
Rotacione imediatamente se um secret aparecer em: log, print, chamado de suporte, transcript
de IA, ou qualquer commit — **mesmo que o commit tenha sido removido depois**. Uma vez que
saiu, considere queimado.

### `JWT_SECRET`
```bash
openssl rand -base64 48
```
Atualize no `.env` e no Railway. **Efeito: derruba todas as sessões ativas** — todo mundo
precisa entrar de novo. Isso é intencional: é o único jeito de invalidar sessões em massa
(resposta a incidente).

### `DATABASE_URL` (Neon)
1. Painel do Neon → Roles → resetar a senha do role.
2. Atualize `DATABASE_URL` no `.env` e no Railway.
3. Redeploy. Há um breve intervalo em que a app antiga falha ao conectar — normal.

### `RESEND_API_KEY`
Dashboard do Resend → API Keys → revogar e criar nova.

---

## 3. Barreiras ativas

**Impedir vazamento de secret**
- `.husky/pre-commit` roda `scripts/check-secrets.mjs`: bloqueia commit de `.env` e de padrões
  de credencial (URLs Postgres com senha, chaves privadas, keys do Resend).
- `gitleaks` no CI varre **todo o histórico**, não só o diff.

**Autenticação**
- Senhas com bcrypt custo 12.
- Sessão em cookie `httpOnly` + `secure` (produção) + `sameSite=lax`, 7 dias.
- **Revogação**: `User.passwordChangedAt` — trocar a senha invalida todos os tokens antigos.
- **Rate limit** (`lib/rate-limit.ts`): login **5 falhas/15min por IP + e-mail** e **20 falhas/15min
  por IP**, cadastro 5/h, reset de senha 3/h. No login só tentativa que **falha** consome cota, e
  acertar a senha zera o balde da conta (não o do IP — senão quem tem conta válida na rede
  zeraria o contador a cada acerto e seguiria varrendo as outras). Os dois baldes existem
  porque um IP é muita gente: consultório, laboratório da faculdade, Wi-Fi de evento.
- Login não revela se o e-mail existe (mesma mensagem **e** mesmo tempo de resposta —
  compara contra um hash dummy quando o usuário não existe).
- Suspensão de profissional tem efeito **imediato** (revalidada em `requireRole`).

**Borda**
- CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, HSTS em produção (`next.config.js`).
- Mutação nunca por GET (uma navegação cross-site carrega cookie `Lax`).

**Dado de saúde (LGPD)**
- `AuditLog` registra quem acessou dado de saúde de qual paciente.
- Histórico de medidas é escopado à janela do relacionamento — um profissional não vê
  registros da época em que o paciente esteve com outro.

---

## 4. Limitações conhecidas (assumidas conscientemente)

- **Rate limit é em memória**: zera a cada deploy e conta por instância. Resolve força bruta
  de bot; num deploy com várias instâncias o limite efetivo multiplica. Trocar por Redis se
  escalar horizontalmente.
- **Cadastro revela se um e-mail já existe.** Esconder isso exigiria remover o login
  automático pós-cadastro (o header `Set-Cookie` denuncia os dois casos de qualquer forma, então
  uma resposta "genérica" seria teatro). Mitigado pelo rate limit de 5/h por IP.
- **Sem verificação de e-mail** no cadastro.
- **Direitos do titular (LGPD Art. 18)** — exportar e excluir conta ainda não implementados.
- **Termos de uso e política de privacidade não existem.** Bloqueante antes de operar com
  usuários reais.

---

## 5. Reportar uma vulnerabilidade

Envie para o e-mail do administrador da plataforma. Não abra issue pública.
