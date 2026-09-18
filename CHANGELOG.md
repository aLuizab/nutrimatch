# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).
Versionamento [semântico](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`.

Como este é um aplicativo e não uma biblioteca, "quebra de compatibilidade" aqui
significa algo que exige ação de quem opera a plataforma — uma migração que não
volta atrás, uma variável de ambiente nova obrigatória, uma mudança de regra que
altera cobrança. Nada disso pode aparecer só no corpo de um commit.

A versão `1.0.0` fica reservada para quando o fluxo de pagamento tiver rodado de
ponta a ponta com dinheiro real: cobrança, confirmação e repasse. Até lá, `0.x`.

## [Não lançado]

<!-- Entradas novas entram aqui. No release, viram uma seção com número e data. -->

### Adicionado

- Branch `staging` com ambiente próprio, para que mudança de risco seja testada
  antes de alcançar paciente e nutricionista de verdade.
- Versionamento semântico, `CHANGELOG.md` e `npm run release`, que move as
  entradas de "Não lançado" para uma seção datada e cria a tag.
- Workflow que publica a página do release no GitHub a partir do changelog.
- Modelo de pull request com checklist de migração, variável de ambiente e risco.
- `docs/FLUXO-DE-TRABALHO.md` com o caminho do código, a proteção de branch a
  configurar e a separação dos bancos.

### Modificado

- Design system do NutriMatch aplicado ao front end: paleta verde da marca,
  neutros com fundo esverdeado, amarelo próprio para as estrelas e a fonte Inter
  servida pelo próprio domínio.
- Movimento na interface: fundo pontilhado e brilho no título do topo, chips de
  especialidade flutuando fora de fase, seções que entram ao rolar, contadores que
  contam até o número e cartões que se elevam ao passar o mouse. Tudo desligado
  para quem pede menos movimento no sistema operacional.
- Página inicial reconstruída: cartões de profissionais flutuando ao redor do
  título, abas "Para Pacientes / Para Profissionais" com a grade de recursos, e
  uma prévia escura da busca com filtros que funcionam de verdade.

- O CI passa a rodar também em `staging`.

### Corrigido

- A extração de notas do release lia `[0.1.0]` como classe de caracteres de
  expressão regular e nunca casava com o título da seção — a página do release
  sairia vazia no primeiro uso.

## [0.1.0] — 2026-09-18

Primeira versão numerada. Reúne o que já estava em produção quando o
versionamento passou a existir.

### Adicionado

- Busca de nutricionistas com filtros, ordenação por reputação e perfil público.
- Agendamento com agenda em tempo real, confirmação pelo profissional em até 24h
  e sala de vídeo liberada 5 minutos antes da consulta.
- Assinatura mensal de R$ 9,90 para o profissional aparecer na busca, com período
  de carência controlado por `SUBSCRIPTION_ENFORCED_FROM`.
- Pagamento da consulta por link do InfinitePay, um por profissional e um por
  pacote, exibido como QR code para o paciente.
- Repasse ao profissional pela chave Pix, descontada a taxa da plataforma.
- Sistema de reputação nos dois lados: nível visível do profissional e
  confiabilidade interna do paciente.
- Metas do paciente com progresso, prazo e histórico.
- Foto de perfil via Cloudinary.
- Notificações por e-mail em cada passo: cadastro, senha alterada, agendamento,
  cancelamento, remarcação, pagamento declarado, confirmado ou recusado, repasse
  enviado e mensalidade registrada.
- Comunicados da plataforma com descadastro por link assinado.
- Páginas de termos, privacidade e política de cancelamento.

### Segurança

- Sessão revogável: trocar a senha invalida os tokens de todos os outros
  dispositivos.
- Limite de tentativas em login, cadastro e recuperação de senha.
- Registro de auditoria para toda ação administrativa sobre pessoas e dinheiro.
- CSP restritiva, sem `unsafe-eval` em produção.
