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

### Alterado

- **O nutricionista não aceita mais consulta.** Conferido o pagamento, a consulta
  fica marcada na hora, nos três painéis. Ele continua podendo cancelar o que não
  puder atender — o valor volta integralmente ao paciente e o cancelamento pesa na
  confiabilidade dele. `AWAITING_CONFIRMATION` passou a significar apenas
  "aguardando pagamento".
- Sem o aceite não há tempo de resposta a medir: a componente saiu do ranking
  (0.25) e da reputação (0.15). O peso foi para avaliações e, principalmente, para
  confiabilidade, que dobrou por virar o único sinal de comportamento. A coluna
  `medianResponseSecs` parou de ser alimentada e o selo "responde em ~Xh" saiu da
  busca e do perfil.
- Consulta **expirada deixou de pesar** contra o nutricionista. Antes expirar era
  ele não responder; hoje é o paciente não pagar, e descontar isso dele seria
  cobrar a desistência de outra pessoa.
- A chave Pix do nutricionista não depende mais de a plataforma ter chave própria
  configurada. A dependência escondia o campo inteiro de quem mais precisava dele:
  a chave da plataforma serve para cobrar, a dele para receber.
- Política de Cancelamento, Termos de Uso e a página "como funciona" reescritos
  para o fluxo novo. Saíram também as menções a pagamento com cartão, que esta
  plataforma nunca teve.

### Adicionado

- **Mais medidas em Minha Evolução.** Além de peso e cintura, agora cabem
  composição corporal (percentual de gordura, massa magra) e circunferências
  (quadril, tórax, braço, coxa), atrás de um botão "mais medidas" — todas
  opcionais, porque ninguém mede tudo sempre. O nutricionista passa a ver o
  retrato mais recente na ficha do paciente, não só o gráfico de peso.
- **Acompanhamento de hábitos**, em Minha Evolução: uma faixa de sete dias por
  hábito, com meta semanal opcional e contagem de dias seguidos. A sequência não
  zera enquanto o dia de hoje está em branco — às dez da manhã ninguém cumpriu o
  hábito ainda, e zerar ali transformaria o único número motivador da tela em
  castigo por acordar. Arquivar um hábito preserva o histórico dele.
- **Disponibilidade por data, além da grade da semana.** O nutricionista fecha um
  dia (feriado, viagem) ou dá a ele um horário próprio, num calendário em
  `/configuracoes` → Disponibilidade. Uma exceção de data vence a grade semanal:
  fechado zera o dia, e horário especial substitui o da semana em vez de somar.
- **A agenda abre para 3 meses**, não mais 21 dias — retorno mensal é o caso mais
  comum de um acompanhamento e simplesmente não cabia na janela anterior. O
  paciente escolhe o dia num calendário mensal, com as vagas de cada dia à vista.
- Visão de **mês** na agenda do nutricionista, ao lado da de semana, com a
  contagem de consultas por dia. Clicar num dia abre a semana dele — achar uma
  consulta marcada para dentro de dois meses deixou de exigir nove cliques em
  "próxima semana".
- Repasse em três etapas — **a repassar**, **em processamento** e **repassado** —
  com listagem em `/repasses` para o nutricionista e em `/admin/financeiro` para a
  administração. O nutricionista vê a receita por consulta, já líquida.
- **Comprovante obrigatório para concluir um repasse.** Sem o arquivo anexado o
  repasse não passa de "em processamento": sem documento, "já te paguei" é só a
  palavra de quem pagou. O arquivo fica no banco (`StoredFile`) e é servido por
  `/api/arquivos/[id]`, visível só para a administração e para o dono do repasse.
- Campanha de lançamento: as **200 primeiras pacientes** a se cadastrar ganham
  10% de desconto na consulta. O cupom (`NUTRI10-042`) vai no e-mail de
  boas-vindas e fica visível em `/admin/pacientes`, com o contador de vagas no
  topo da tela. O desconto não é abatido sozinho no preço — quem aplica é quem
  cobra, porque os links de pagamento têm valor fixo e continuariam cobrando
  cheio. Nutricionista não entra na conta: não compra consulta.
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

- **A foto de perfil volta a funcionar.** Ela nunca funcionou: dependia de três
  credenciais do Cloudinary que jamais foram configuradas, e o botão ficava
  desabilitado dizendo "não configurado neste servidor". A imagem passa a ser
  guardada no próprio banco, reduzida no navegador antes de subir (uns 60KB), e
  servida por `/api/foto/[id]`. Foto de nutricionista ativo é pública, porque já
  está no perfil público dele; a de paciente só é servida a ela mesma, à
  administração e aos nutricionistas que a atendem. O Cloudinary saiu do projeto.

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
