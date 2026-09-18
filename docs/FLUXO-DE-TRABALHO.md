# Fluxo de trabalho, ambientes e releases

Escrito para quem vai desenvolver e operar o NutriMatch — hoje uma pessoa, e é
por isso que o processo é curto. Cada regra aqui existe para impedir um acidente
que já aconteceu ou que custaria caro; nenhuma existe por cerimônia.

## Os dois ambientes

| | `staging` | `main` |
|---|---|---|
| Branch | `staging` | `main` |
| Deploy | ambiente *staging* no Railway | ambiente *production* no Railway |
| Banco | branch do Neon, cópia isolada | Neon de produção |
| Usuários | ninguém real | pacientes e nutricionistas de verdade |
| Pode quebrar? | sim, é para isso | não |

`staging` é o lugar onde uma migração destrutiva, uma mudança de cobrança ou um
disparo de e-mail em massa são testados **antes** de alcançar gente real.

### O banco de staging precisa ser separado

Este é o ponto mais importante do documento. Durante boa parte do
desenvolvimento, o `.env` local apontou para o banco de **produção** — e isso
levou a apagar dados reais uma vez. O Neon resolve isso com branch de banco:

1. No painel do Neon, **Branches → New branch** a partir de `main`, nome `staging`.
2. Copie a connection string dela.
3. Use essa string no `DATABASE_URL` do ambiente de staging do Railway **e no seu
   `.env` local**.

A partir daí, desenvolver localmente não toca em dado de ninguém.

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
   você mudou, com dados que não são de ninguém.
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
| `DATABASE_URL` | branch do Neon | Neon de produção |
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
- [ ] Testado em staging, não só localmente
- [ ] `CHANGELOG.md` atualizado em "Não lançado"
- [ ] Variável de ambiente nova já criada no Railway **antes** do deploy
