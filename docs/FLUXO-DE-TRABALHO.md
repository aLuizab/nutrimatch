# Fluxo de trabalho, ambientes e releases

Escrito para quem vai desenvolver e operar o NutriMatch — hoje uma pessoa, e é
por isso que o processo é curto. Cada regra aqui existe para impedir um acidente
que já aconteceu ou que custaria caro; nenhuma existe por cerimônia.

## Os dois ambientes

| | `staging` | `main` |
|---|---|---|
| Branch | `staging` | `main` |
| Deploy | ambiente *staging* no Railway | ambiente *production* no Railway |
| Banco | **o mesmo de produção** (provisório) | Neon de produção |
| Usuários | os reais, porque o banco é o mesmo | pacientes e nutricionistas de verdade |
| Pode quebrar? | o código sim, os dados não | não |

### ⚠ O banco ainda é compartilhado

Decisão consciente para não travar o início, mas ela limita bastante o que o
staging protege. Enquanto os dois apontarem para o mesmo banco, **staging serve
para testar código, não para testar efeito sobre dados**.

O que continua seguro testar lá: tela, texto, layout, navegação, regra que só
lê, e se a aplicação sobe sem erro.

O que **não** se testa em staging hoje, porque atinge gente de verdade:

- **Comunicados.** `/admin/comunicados` manda e-mail para os usuários reais da
  lista. Não existe "mandar só para teste".
- **Confirmar ou recusar pagamento**, marcar repasse como pago, registrar
  mensalidade. Tudo grava no mesmo lugar que produção lê.
- **Aprovar ou suspender profissional.**
- **Apagar qualquer coisa.**
- **Migração destrutiva** — veja abaixo.

#### Migrations não rodam em staging

O ambiente de staging deve ter `SKIP_MIGRATIONS=1`. Sem isso, subir staging com
uma migração nova a aplicaria no banco de **produção**, antes do código que
precisa dela chegar lá — o contrário do que homologação existe para fazer.

Então a ordem hoje é: a migração vai para produção junto com o merge em `main`.
Revise o SQL antes, porque staging não vai pegar o erro para você.

### Como separar, quando for a hora

1. No painel do Neon, **Branches → New branch** a partir de `main`, nome `staging`.
2. Copie a connection string dela.
3. Use essa string no `DATABASE_URL` do ambiente de staging do Railway **e no seu
   `.env` local**.
4. Tire o `SKIP_MIGRATIONS` do staging.

O passo 3 é o que mais importa: hoje o `.env` local aponta para produção, e foi
assim que dados reais foram apagados uma vez durante o desenvolvimento.

## Como o código anda

```
feat/nome-curto ──PR──> staging ──PR──> main
                          │               │
                    deploy staging   deploy produção
                                          │
                                     tag vX.Y.Z
```

1. **Branch a partir de `staging`**, com prefixo: `feat/`, `fix/`, `chore/` ou
   `docs/`.
2. **PR para `staging`.** O CI roda typecheck, lint, build, scanner de secrets e
   auditoria de dependências. Nada entra vermelho.
3. **Merge em `staging`** publica no ambiente de homologação. Teste ali o que
   você mudou — lembrando que o banco ainda é o de produção, então vale para
   conferir tela e comportamento, não para mexer em dado.
4. **PR de `staging` para `main`** quando quiser publicar. Esse PR é o release:
   reúne tudo que foi para homologação desde a última publicação.
5. **Tag** depois do merge (veja abaixo). A tag é o que vira release no GitHub.

### Quando pular staging

Correção urgente em produção: branch `hotfix/` a partir de `main`, PR direto para
`main`, e **depois** um PR de `main` para `staging` para as duas não divergirem.
Esquecer esse segundo passo é como a correção some no próximo release.

## Proteção da branch (configurar no GitHub)

Sem isso, todo o resto é sugestão. Em **Settings → Branches → Add rule**, para
`main` e para `staging`:

- ☑ Require a pull request before merging
- ☑ Require status checks to pass: `Typecheck, lint e build`, `Scanner de
  secrets`, `Vulnerabilidades em dependências`
- ☑ Require branches to be up to date before merging
- ☑ Do not allow bypassing the above settings

Trabalhando sozinho, não marque "Require approvals" — você ficaria travado sem
poder aprovar o próprio PR. O que protege aqui é o CI, não a revisão humana.

## Releases e versões

Versionamento semântico, `MAJOR.MINOR.PATCH`, registrado em `package.json` e no
`CHANGELOG.md`.

Como isto é um aplicativo e não uma biblioteca, **MAJOR** significa "exige ação
de quem opera": migração que não volta atrás, variável de ambiente nova
obrigatória, mudança que altera cobrança. **MINOR** é funcionalidade nova.
**PATCH** é correção.

Para publicar:

```bash
npm run release -- minor    # ou major, patch, ou um número exato como 0.4.2
git push --follow-tags
```

O script confere que você está em `main`, que a árvore está limpa e que o
`CHANGELOG.md` tem entradas em "Não lançado"; move essas entradas para uma seção
com número e data, atualiza o `package.json` e cria o commit e a tag.

O push da tag dispara o workflow de release, que cria a página do release no
GitHub com o trecho correspondente do changelog.

## Variáveis de ambiente por ambiente

| Variável | staging | produção |
|---|---|---|
| `DATABASE_URL` | o mesmo de produção, por ora | Neon de produção |
| `SKIP_MIGRATIONS` | `1` enquanto o banco for compartilhado | nunca definida |
| `JWT_SECRET` | um valor próprio | **outro** valor, nunca o mesmo |
| `NEXT_PUBLIC_APP_URL` | URL do staging | `https://nutrimatch.com.br` |
| `RESEND_API_KEY` | chave só-envio | chave só-envio |
| `EMAIL_FROM` | igual produção | `NutriMatch <nao-responda@nutrimatch.com.br>` |
| `PAYMENT_LINK_URL` / links | links de teste | links reais |
| `SUBSCRIPTION_ENFORCED_FROM` | uma data passada, para testar a trava | vazia até decidir ligar |

Segredo de staging nunca é igual ao de produção. Se fosse, um token emitido em
homologação valeria na conta de um paciente real.

## Antes de mandar para produção

- [ ] CI verde no PR
- [ ] Migração revisada: `ADD COLUMN` anulável e `CREATE TABLE` são seguros;
      `DROP`, `NOT NULL` em tabela existente e renomeação exigem plano de volta
- [ ] Testado em staging, não só localmente — e, para o que escreve no banco,
      testado com consciência de que o banco é o de produção
- [ ] `CHANGELOG.md` atualizado em "Não lançado"
- [ ] Variável de ambiente nova já criada no Railway **antes** do deploy
