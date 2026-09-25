// pt-BR e-mail templates. Plain inline-styled HTML — e-mail clients ignore stylesheets.
const wrap = (title: string, body: string) => `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px;">
      Nutri<span style="color: #10b981;">Match</span>
    </p>
    <h1 style="font-size: 17px; color: #111827; margin: 20px 0 12px;">${title}</h1>
    <div style="font-size: 14px; color: #374151; line-height: 1.6;">${body}</div>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 28px;">
      Você recebeu este e-mail porque tem uma conta no NutriMatch.
    </p>
  </div>`

export interface AppointmentEmailData {
  patientName: string
  professionalName: string
  dateLabel: string
  timeLabel: string
  modalityLabel: string
  priceLabel: string
}

/**
 * `paymentConfirmed` existe porque este e-mail passou a ser o único que o paciente recebe
 * quando o admin confere o extrato. Antes vinham dois — "pagamento confirmado" e depois
 * "consulta confirmada", quando o profissional aceitava. Com a consulta sendo marcada pela
 * própria confirmação do pagamento, mandar os dois seria contar a mesma novidade duas vezes.
 */
export function bookingConfirmedPatient(d: AppointmentEmailData & { paymentConfirmed?: boolean }) {
  return {
    subject: `Consulta confirmada com ${d.professionalName}`,
    html: wrap(
      'Sua consulta está confirmada! ✅',
      `<p>Olá, ${d.patientName}!</p>
       ${
         d.paymentConfirmed
           ? `<p>Conferimos seu pagamento de <strong>${d.priceLabel}</strong> e sua consulta com
              <strong>${d.professionalName}</strong> está marcada:</p>`
           : `<p>Sua consulta com <strong>${d.professionalName}</strong> foi agendada:</p>`
       }
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p>Se for online, <strong>o link da sala chega por e-mail 5 minutos antes</strong> — para
          você e para o profissional. Não precisa procurar nada na hora.</p>
       <p>Se precisar, você pode cancelar em <em>Minhas Consultas</em> na plataforma.</p>`
    ),
  }
}

export function bookingReceivedProfessional(d: AppointmentEmailData) {
  return {
    subject: `Consulta marcada: ${d.patientName} — ${d.dateLabel} às ${d.timeLabel}`,
    html: wrap(
      'Você tem uma consulta marcada 🗓️',
      `<p><strong>${d.patientName}</strong> agendou e pagou uma consulta com você:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p>Ela <strong>já está confirmada</strong> — você não precisa aceitar nada. O valor menos a
          taxa da plataforma aparece em <em>Repasses</em> assim que o pagamento é conferido.</p>
       <p>Se for online, <strong>o link da sala chega por e-mail 5 minutos antes</strong>, para você
          e para o paciente.</p>
       <p>Se não puder atender neste horário, cancele pela sua <em>Agenda</em> o quanto antes: o
          paciente recebe o valor de volta e cancelamento em cima da hora pesa na sua
          confiabilidade.</p>`
    ),
  }
}

export function appointmentCancelled(d: AppointmentEmailData & { recipientName: string; cancelledBy: string }) {
  return {
    subject: `Consulta de ${d.dateLabel} às ${d.timeLabel} foi cancelada`,
    html: wrap(
      'Consulta cancelada',
      `<p>Olá, ${d.recipientName}.</p>
       <p>A consulta entre <strong>${d.patientName}</strong> e <strong>${d.professionalName}</strong>,
          marcada para <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong>,
          foi cancelada por ${d.cancelledBy}.</p>
       <p>O horário voltou a ficar disponível para novos agendamentos.</p>`
    ),
  }
}

export function appointmentRescheduled(
  d: AppointmentEmailData & { recipientName: string; oldDateLabel: string; oldTimeLabel: string }
) {
  return {
    subject: `Consulta remarcada: agora ${d.dateLabel} às ${d.timeLabel}`,
    html: wrap(
      'Consulta remarcada 🗓️',
      `<p>Olá, ${d.recipientName}.</p>
       <p>A consulta entre <strong>${d.patientName}</strong> e <strong>${d.professionalName}</strong>,
          que estava marcada para <strong>${d.oldDateLabel}</strong> às <strong>${d.oldTimeLabel}</strong>,
          foi remarcada para:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}</p>`
    ),
  }
}

export function markedNoShow(d: AppointmentEmailData & { contestUrl: string }) {
  return {
    subject: `Falta registrada na consulta de ${d.dateLabel}`,
    html: wrap(
      'Registramos uma falta na sua consulta',
      `<p>Olá, ${d.patientName}.</p>
       <p><strong>${d.professionalName}</strong> registrou que você não compareceu à consulta de
          <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong>.</p>
       <p>Se isso está errado, você pode contestar — é rápido e a falta deixa de contar enquanto
          a contestação estiver em análise:</p>
       <p><a href="${d.contestUrl}" style="color: #10b981; font-weight: 600;">Contestar em Minhas Consultas</a></p>
       <p style="color: #6b7280;">Faltas sem aviso limitam quantas consultas você pode manter
          agendadas ao mesmo tempo — nada além disso, e nenhum profissional vê essa informação.</p>`
    ),
  }
}

export function professionalApproved(name: string) {
  return {
    subject: 'Seu perfil foi aprovado no NutriMatch! 🎉',
    html: wrap(
      'Bem-vindo(a) ao NutriMatch!',
      `<p>Olá, ${name}!</p>
       <p>Seu perfil profissional foi <strong>aprovado</strong> e já aparece nas buscas da plataforma.</p>
       <p>Confira em <em>Configurações → Disponibilidade</em> se seus horários de atendimento
          estão do jeito que você quer — pacientes já podem agendar com você.</p>`
    ),
  }
}

export function reviewReceived(professionalName: string, patientFirstName: string, rating: number) {
  return {
    subject: `Você recebeu uma nova avaliação: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
    html: wrap(
      'Nova avaliação recebida ⭐',
      `<p>Olá, ${professionalName}!</p>
       <p><strong>${patientFirstName}</strong> avaliou uma consulta com nota <strong>${rating}/5</strong>.</p>
       <p>Veja o comentário completo no seu perfil público.</p>`
    ),
  }
}

export function passwordResetEmail(name: string, link: string) {
  return {
    subject: 'Redefinir sua senha do NutriMatch',
    html: wrap(
      'Redefinição de senha',
      `<p>Olá, ${name}.</p>
       <p>Recebemos um pedido para redefinir a senha da sua conta. O link abaixo vale por
          <strong>30 minutos</strong> e só pode ser usado uma vez:</p>
       <p style="margin: 24px 0;">
         <a href="${link}" style="background: #10b981; color: #ffffff; text-decoration: none; font-weight: 700; padding: 12px 20px; border-radius: 10px; display: inline-block;">
           Redefinir minha senha
         </a>
       </p>
       <p style="font-size: 13px; color: #6b7280;">
         Se você não pediu isso, pode ignorar este e-mail — sua senha continua a mesma.
       </p>`
    ),
  }
}

/**
 * Aviso de que alguém pediu um horário e está no meio do pagamento.
 *
 * Deliberadamente NÃO é um chamado para ação, e agora por um motivo mais forte do que antes: o
 * profissional não aceita consulta nenhuma. Quem marca é a confirmação do pagamento, então não
 * existe nada que ele possa fazer neste momento além de saber que o horário está sendo
 * reservado — e sem este e-mail ele veria o horário sumir da agenda sem explicação.
 */
export function bookingPendingPaymentProfessional(d: AppointmentEmailData) {
  return {
    subject: `${d.patientName} está reservando ${d.dateLabel} às ${d.timeLabel}`,
    html: wrap(
      'Alguém está reservando um horário seu',
      `<p><strong>${d.patientName}</strong> pediu este horário e está fazendo o pagamento:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p><strong>Você não precisa fazer nada.</strong> Assim que conferirmos o pagamento, a
          consulta é marcada automaticamente e você recebe o aviso com os detalhes.</p>
       <p style="font-size: 13px; color: #6b7280;">
         Este é só um aviso para você não ser pego de surpresa. Se o pagamento não sair, o
         horário volta a ficar livre e nada mais chega.
       </p>`
    ),
  }
}

export function appointmentReminderPatient(d: AppointmentEmailData & { meetingUrl?: string | null }) {
  return {
    subject: `Lembrete: consulta amanhã com ${d.professionalName}`,
    html: wrap(
      'Sua consulta é amanhã ⏰',
      `<p>Olá, ${d.patientName}!</p>
       <p>Passando para lembrar da sua consulta com <strong>${d.professionalName}</strong>:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}</p>
       ${
         d.meetingUrl
           ? `<p><strong>Você recebe o link por e-mail 5 minutos antes da consulta</strong>, então
                 não precisa guardar este. Se preferir deixar salvo:<br/>
              <a href="${d.meetingUrl}" style="color: #10b981;">${d.meetingUrl}</a></p>`
           : ''
       }
       <p>Se não puder comparecer, cancele em <em>Minhas Consultas</em> para liberar o horário.</p>`
    ),
  }
}

export function appointmentReminderProfessional(d: AppointmentEmailData & { meetingUrl?: string | null }) {
  return {
    subject: `Lembrete: consulta amanhã com ${d.patientName}`,
    html: wrap(
      'Você tem consulta amanhã ⏰',
      `<p>Olá, ${d.professionalName}!</p>
       <p>Sua consulta com <strong>${d.patientName}</strong> é amanhã:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}</p>
       ${
         d.meetingUrl
           ? `<p>Link da chamada:<br/>
              <a href="${d.meetingUrl}" style="color: #10b981;">${d.meetingUrl}</a></p>`
           : ''
       }`
    ),
  }
}
export function packageRefunded(d: {
  patientName: string
  planName: string
  professionalName: string
  unused: number
  total: number
  amountLabel: string
}) {
  return {
    subject: `Devolução do seu acompanhamento com ${d.professionalName}`,
    html: wrap(
      'Devolvemos o que não foi usado 💸',
      `<p>Olá, ${d.patientName}!</p>
       <p>Seu acompanhamento <strong>${d.planName}</strong> com <strong>${d.professionalName}</strong>
          chegou ao fim do prazo.</p>
       <p>Das <strong>${d.total}</strong> consultas do pacote, <strong>${d.unused}</strong>
          não ${d.unused === 1 ? 'foi realizada' : 'foram realizadas'}. Estamos devolvendo
          <strong>${d.amountLabel}</strong> na forma de pagamento original.</p>
       <p>O valor costuma aparecer na fatura em até 10 dias úteis, conforme o banco emissor.</p>
       <p>Se quiser continuar o acompanhamento, é só contratar um novo pacote pela plataforma.</p>`
    ),
  }
}

// ── Dinheiro ────────────────────────────────────────────────────────────────
// A conferência do pagamento é humana dos dois lados: o paciente avisa, alguém confere o
// extrato, alguém libera. Cada uma dessas passagens precisa de e-mail, senão o silêncio vira a
// resposta — e silêncio depois de pagar é a pior experiência que esta plataforma pode dar.

export function paymentDeclaredPatient(d: { patientName: string; what: string; amountLabel: string }) {
  return {
    subject: 'Recebemos seu aviso de pagamento',
    html: wrap(
      'Recebemos seu aviso 👍',
      `<p>Olá, ${d.patientName}!</p>
       <p>Você avisou que pagou <strong>${d.amountLabel}</strong> referente a ${d.what}.</p>
       <p>Vamos conferir a entrada e confirmar. Você recebe um novo e-mail assim que estiver
          confirmado — normalmente em algumas horas, em dia útil.</p>
       <p>Ainda não precisa fazer mais nada.</p>`
    ),
  }
}

export function paymentPendingAdmin(d: { what: string; amountLabel: string; who: string; note?: string | null }) {
  return {
    subject: `Pagamento a conferir: ${d.amountLabel} — ${d.who}`,
    html: wrap(
      'Há um pagamento aguardando conferência',
      `<p><strong>${d.who}</strong> avisou que pagou <strong>${d.amountLabel}</strong> referente a
          ${d.what}.</p>
       ${d.note ? `<p>Observação de quem pagou: <em>${d.note}</em></p>` : ''}
       <p>Confira o extrato e confirme em <em>Financeiro</em> no painel administrativo. Confirmar
          <strong>marca a consulta</strong> e abre o repasse ao profissional. Enquanto isso, o
          horário segue preso e o paciente está esperando.</p>`
    ),
  }
}

export function paymentConfirmedPatient(d: { patientName: string; what: string; amountLabel: string }) {
  return {
    subject: 'Pagamento confirmado',
    html: wrap(
      'Pagamento confirmado ✅',
      `<p>Olá, ${d.patientName}!</p>
       <p>Confirmamos o recebimento de <strong>${d.amountLabel}</strong> referente a ${d.what}.</p>
       <p>Está tudo certo do seu lado — não precisa fazer mais nada.</p>`
    ),
  }
}

export function paymentRejectedPatient(d: {
  patientName: string
  what: string
  amountLabel: string
  reason?: string | null
}) {
  return {
    subject: 'Não localizamos seu pagamento',
    html: wrap(
      'Não localizamos seu pagamento',
      `<p>Olá, ${d.patientName}!</p>
       <p>Procuramos a entrada de <strong>${d.amountLabel}</strong> referente a ${d.what} e não
          encontramos.</p>
       ${d.reason ? `<p>Motivo registrado: <em>${d.reason}</em></p>` : ''}
       <p>Isso acontece quando o pagamento ainda não compensou ou foi feito com outro valor. Se
          você já pagou, responda este e-mail com o comprovante que a gente verifica na mão.</p>
       <p>Nenhum valor foi cobrado por nós — o horário continua reservado por enquanto.</p>`
    ),
  }
}

export function payoutPaidProfessional(d: {
  professionalName: string
  amountLabel: string
  feeLabel: string
  grossLabel: string
  pixKeyMasked: string
}) {
  return {
    subject: `Repasse enviado: ${d.amountLabel}`,
    html: wrap(
      'Seu repasse foi enviado 💸',
      `<p>Olá, ${d.professionalName}!</p>
       <p>Enviamos <strong>${d.amountLabel}</strong> para a sua chave Pix <strong>${d.pixKeyMasked}</strong>.</p>
       <p>Valor recebido do paciente: ${d.grossLabel}<br/>
          Taxa da plataforma: ${d.feeLabel}<br/>
          <strong>Repassado a você: ${d.amountLabel}</strong></p>
       <p>Se não aparecer na sua conta em algumas horas, confira se a chave cadastrada está
          correta em <em>Configurações → Pagamentos</em>.</p>`
    ),
  }
}

export function subscriptionRecordedProfessional(d: {
  professionalName: string
  amountLabel: string
  untilLabel: string
}) {
  return {
    subject: `Mensalidade registrada — ativa até ${d.untilLabel}`,
    html: wrap(
      'Mensalidade registrada ✅',
      `<p>Olá, ${d.professionalName}!</p>
       <p>Registramos o pagamento de <strong>${d.amountLabel}</strong> da sua mensalidade.</p>
       <p>Seu perfil fica ativo na busca <strong>até ${d.untilLabel}</strong>.</p>
       <p>Para continuar aparecendo depois dessa data, renove antes do vencimento.</p>`
    ),
  }
}

export function appointmentExpiredPatient(d: AppointmentEmailData) {
  return {
    subject: `${d.professionalName} não confirmou sua consulta`,
    html: wrap(
      'Sua consulta não foi confirmada a tempo',
      `<p>Olá, ${d.patientName}!</p>
       <p>O horário de <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong> com
          ${d.professionalName} expirou sem confirmação, e foi liberado.</p>
       <p>Se você pagou, o valor será devolvido — nenhuma ação sua é necessária.</p>
       <p>Você pode escolher outro horário ou outro profissional na plataforma quando quiser.</p>`
    ),
  }
}

/**
 * O link da sala, minutos antes de começar. Vai para os dois lados.
 *
 * É o e-mail mais importante de uma consulta online, e por isso é o mais curto: quem o abre está
 * de pé, a caminho do computador, e precisa de uma coisa só — o botão. Tudo o que estiver em
 * volta dele compete com ele.
 *
 * Não respeita preferência de notificação de nenhum dos dois. Silenciar isto é silenciar o
 * endereço da consulta que a pessoa já pagou.
 */
export function meetingStartingSoon(d: {
  recipientName: string
  otherName: string
  timeLabel: string
  minutesLabel: string
  meetingUrl: string
}) {
  return {
    subject: `Sua consulta começa em instantes — ${d.timeLabel}`,
    html: wrap(
      'Sua consulta está começando 🎥',
      `<p>Olá, ${d.recipientName}!</p>
       <p>Sua consulta com <strong>${d.otherName}</strong> começa às <strong>${d.timeLabel}</strong>,
          daqui a ${d.minutesLabel}.</p>
       <p style="margin: 20px 0;">
         <a href="${d.meetingUrl}"
            style="background: #10b981; color: #ffffff; text-decoration: none; font-weight: 700;
                   padding: 14px 28px; border-radius: 12px; display: inline-block; font-size: 15px;">
           Entrar na consulta
         </a>
       </p>
       <p style="font-size: 13px; color: #6b7280;">
         Se o botão não funcionar, copie este endereço no navegador:<br/>
         <span style="word-break: break-all;">${d.meetingUrl}</span>
       </p>`
    ),
  }
}

// ── Conta ───────────────────────────────────────────────────────────────────

/**
 * Bloco do cupom de lançamento. Fica dentro do e-mail de boas-vindas em vez de virar uma segunda
 * mensagem: duas chegando no mesmo minuto do cadastro competem entre si e a segunda é a que
 * costuma ir para promoções. Aqui ele é a primeira coisa depois da saudação.
 */
function blocoCupom(d: { code: string; percent: number }) {
  return `<div style="border: 1px solid #a7f3d0; background: #ecfdf5; border-radius: 12px; padding: 16px; margin: 16px 0;">
       <p style="margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em;">
         ${d.percent}% de desconto na consulta
       </p>
       <p style="margin: 0 0 10px; font-size: 14px; color: #374151; line-height: 1.6;">
         Você entrou entre as primeiras pessoas cadastradas e ganhou <strong>${d.percent}% de desconto
         na sua consulta</strong>. Seu código:
       </p>
       <p style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #065f46; letter-spacing: 0.06em;">
         ${d.code}
       </p>
       <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
         Agende normalmente e informe este código na hora de combinar o pagamento — o desconto já
         está registrado na sua conta.
       </p>
     </div>`
}

export function welcomePatient(d: {
  name: string
  searchUrl: string
  discount?: { code: string; percent: number }
}) {
  return {
    subject: d.discount
      ? `Bem-vinda ao NutriMatch — e ${d.discount.percent}% de desconto na sua consulta 🥗`
      : 'Bem-vinda ao NutriMatch! 🥗',
    html: wrap(
      d.discount ? 'Sua conta está pronta — e tem desconto' : 'Sua conta está pronta',
      `<p>Olá, ${d.name}!</p>
       ${d.discount ? blocoCupom(d.discount) : ''}
       <p>Sua conta foi criada. A partir de agora você pode comparar nutricionistas por preço,
          avaliação e disponibilidade, e agendar online ou presencial.</p>
       <p><a href="${d.searchUrl}" style="color: #10b981; font-weight: 600;">Encontrar um nutricionista</a></p>
       <p>Duas coisas que talvez você não saiba:</p>
       <p>• Só quem teve consulta pela plataforma pode avaliar — as notas que você vê são de
          pacientes de verdade.<br/>
          • Você pode definir metas e acompanhar sua evolução em <em>Minhas Metas</em>.</p>`
    ),
  }
}

export function welcomeProfessional(d: { name: string; monthlyLabel: string; settingsUrl: string }) {
  return {
    subject: 'Cadastro recebido — próximos passos',
    html: wrap(
      'Recebemos seu cadastro',
      `<p>Olá, ${d.name}!</p>
       <p>Seu perfil foi criado e está <strong>em análise</strong>. Conferimos seu CRN no portal do
          conselho antes de publicar — é o que garante que todo nutricionista aqui é registrado de
          verdade. Você recebe um e-mail assim que for aprovado.</p>
       <p>Enquanto isso, deixe o perfil pronto em
          <a href="${d.settingsUrl}" style="color: #10b981; font-weight: 600;">Configurações</a>:</p>
       <p>• <strong>Sua chave Pix</strong> — é por onde a plataforma repassa o valor das consultas.
          Sem ela não conseguimos te pagar.<br/>
          • <strong>Seus horários</strong> — o paciente só vê o que estiver livre na sua agenda.<br/>
          • <strong>Seu valor</strong> — você define; a plataforma retém 10% por consulta.</p>
       <p>O cadastro é gratuito. Para aparecer na busca e receber agendamentos, a mensalidade é de
          <strong>${d.monthlyLabel}</strong>.</p>`
    ),
  }
}

/**
 * Aviso de segurança, não notificação de conveniência: quem não reconhece a troca precisa saber
 * no mesmo instante, porque é o único sinal de que alguém entrou na conta. Por isso este e-mail
 * ignora qualquer preferência de notificação.
 */
export function passwordChangedEmail(d: { name: string; whenLabel: string; resetUrl: string }) {
  return {
    subject: 'Sua senha do NutriMatch foi alterada',
    html: wrap(
      'Sua senha foi alterada',
      `<p>Olá, ${d.name}!</p>
       <p>A senha da sua conta foi alterada em <strong>${d.whenLabel}</strong>, e todas as outras
          sessões foram desconectadas.</p>
       <p><strong>Se foi você, não precisa fazer nada.</strong></p>
       <p>Se não foi, redefina a senha agora mesmo:
          <a href="${d.resetUrl}" style="color: #10b981; font-weight: 600;">redefinir minha senha</a>.</p>`
    ),
  }
}

/**
 * Comunicado da plataforma. Único template com link de descadastro, porque é o único que não
 * responde a algo que a pessoa fez — os outros são transacionais.
 */
export function platformAnnouncement(d: {
  name: string
  title: string
  bodyHtml: string
  unsubscribeUrl: string
}) {
  return {
    subject: d.title,
    html: `
  <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
    <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 4px;">
      Nutri<span style="color: #10b981;">Match</span>
    </p>
    <h1 style="font-size: 17px; color: #111827; margin: 20px 0 12px;">${d.title}</h1>
    <div style="font-size: 14px; color: #374151; line-height: 1.6;">
      <p>Olá, ${d.name}!</p>
      ${d.bodyHtml}
    </div>
    <p style="font-size: 12px; color: #9ca3af; margin-top: 28px;">
      Você recebeu este comunicado porque tem uma conta no NutriMatch.<br/>
      <a href="${d.unsubscribeUrl}" style="color: #9ca3af;">Não quero mais receber novidades</a>
    </p>
  </div>`,
  }
}
