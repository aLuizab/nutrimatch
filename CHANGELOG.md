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

- Contador de 30 minutos na tela de pagamento da consulta, dizendo em letras que
  passando do prazo o agendamento é cancelado e o horário volta para outros
  pacientes. Fica vermelho nos últimos cinco minutos.
- O nutricionista passa a ter como pagar a mensalidade sozinho: link de cobrança
  por plano, cadastrado pelo admin em `/admin/links-de-pagamento`, e botão em
  `/assinatura`. Antes os botões daquela tela chamavam o Stripe e falhavam.
- Botão para o admin confirmar que a mensalidade do mês foi paga, em
  `/admin/profissionais`, com o estado de cada um ao lado ("paga até", "vencida
  há N dias", "nunca paga"). A rota que registra o pagamento já existia e não
  tinha nenhuma tela chamando.
- O admin passa a ver no financeiro as cobranças que o paciente **não** declarou.
  Quem pagava no link e não voltava para avisar sumia da fila e via a consulta
  expirar com o dinheiro já debitado.
- Aviso ao nutricionista quando alguém está reservando um horário dele e pagando,
  para o horário não sumir da agenda sem explicação.
- Branch `staging` com ambiente próprio, para que mudança de risco seja testada
  antes de alcançar paciente e nutricionista de verdade.
- Versionamento semântico, `CHANGELOG.md` e `npm run release`, que move as
  entradas de "Não lançado" para uma seção datada e cria a tag.
- Workflow que publica a página do release no GitHub a partir do changelog.
- Modelo de pull request com checklist de migração, variável de ambiente e risco.
- `docs/FLUXO-DE-TRABALHO.md` com o caminho do código, a proteção de branch a
  configurar e a separação dos bancos.

### Modificado

- **O Stripe foi removido do projeto.** Nunca foi usado — nenhuma conta
  conectada, nenhuma assinatura, nenhum pagamento — e mantê-lo significava
  carregar um segundo caminho de dinheiro que ninguém exercitava. Saíram seis
  rotas, três bibliotecas, a dependência, os domínios da CSP e três variáveis de
  ambiente. **Consequência que precisa ser lida: não existe mais estorno
  automático.** O cálculo de quanto se deve foi preservado, mas devolver o
  dinheiro passou a ser manual, e a fila de devoluções pendentes ainda não existe.
- Prazo para pagar uma consulta: 30 minutos, com contador visível. O relógio só
  corre enquanto o paciente não avisa que pagou — depois disso quem vale é o
  prazo de conferência, senão um pagamento às 23h expiraria antes de alguém poder
  conferir o extrato.
- Limite de tentativas de login passa a contar só o que **falha**, e é chaveado
  por IP + e-mail em vez de só IP. Entrar com três contas e errar duas senhas
  trancava a pessoa para fora, e um consultório inteiro dividia cinco tentativas.
- O e-mail de consulta confirmada deixa de respeitar a preferência de avisos do
  nutricionista: é o comprovante de um compromisso com hora marcada e já pago, e
  perder esse e-mail significa faltar.
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
- Faixa fina no topo da página inicial informando que o projeto participa da
  FETIN 2026, a Feira Tecnológica do Inatel, com link para o evento.

- O CI passa a rodar também em `staging`.
- `SKIP_MIGRATIONS=1` impede que o ambiente de staging aplique migrations. Enquanto
  staging e produção dividem o mesmo banco, subir staging com uma migração nova a
  aplicaria em produção antes do código que precisa dela — o contrário do que um
  ambiente de homologação existe para fazer.

### Corrigido

- O link de pagamento não aparecia depois de agendar. A cobrança exigia chave
  Pix **e** link; a chave só é necessária no repasse, dias depois, então a
  consulta deixava de ser cobrada por um dado que dava tempo de resolver. Agora
  a única condição é existir o link do InfinitePay.
- Nenhum e-mail saía da plataforma: o `.env.example` trazia `EMAIL_FROM` entre
  aspas, e copiado para o painel de deploy as aspas iam junto. A Resend recusava
  com 422 e o único sinal era uma linha de log. As aspas saíram do exemplo e o
  valor passa a ser normalizado antes do envio, com aviso no log se ainda assim
  não servir.
- A extração de notas do release lia `[0.1.0]` como classe de caracteres de
  expressão regular e nunca casava com o título da seção — a página do release
  sairia vazia no primeiro uso.

### Removido

- Últimas menções ao Stripe no código. O que restava eram comentários, e alguns
  já eram falsos: `fees.ts` descontava uma "taxa de processamento do Stripe" que
  não existe, `subscription.ts` apontava para `stripe-connect.ts` (apagado) e o
  limitador dizia poupar webhooks cujo chamador seria o Stripe — não há webhook
  algum. Ficam de fora desta limpeza os padrões `sk_live_…`/`whsec_…` em
  `.gitleaks.toml` e `scripts/check-secrets.mjs`: são o detector de segredos,
  não integração, e servem para barrar uma chave colada por engano.
- As colunas do Stripe **continuam no banco de propósito** e saem num passo
  separado, depois que este código estiver em todos os ambientes. Derrubá-las
  antes disso já quebrou a aplicação uma vez (`P2022`).

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
