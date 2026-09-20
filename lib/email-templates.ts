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

export function bookingConfirmedPatient(d: AppointmentEmailData) {
  return {
    subject: `Consulta confirmada com ${d.professionalName}`,
    html: wrap(
      'Sua consulta está confirmada! ✅',
      `<p>Olá, ${d.patientName}!</p>
       <p>Sua consulta com <strong>${d.professionalName}</strong> foi agendada:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p>Se precisar, você pode cancelar em <em>Minhas Consultas</em> na plataforma.</p>`
    ),
  }
}

export function bookingReceivedProfessional(d: AppointmentEmailData) {
  return {
    subject: `Novo agendamento: ${d.patientName} — ${d.dateLabel} às ${d.timeLabel}`,
    html: wrap(
      'Você recebeu um novo agendamento 🗓️',
      `<p><strong>${d.patientName}</strong> agendou uma consulta com você:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p>Veja os detalhes na sua <em>Agenda</em>.</p>`
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

export function bookingRequestedPatient(d: AppointmentEmailData) {
  return {
    subject: `Solicitação enviada para ${d.professionalName}`,
    html: wrap(
      'Solicitação enviada ⏳',
      `<p>Olá, ${d.patientName}!</p>
       <p>Sua solicitação de consulta com <strong>${d.professionalName}</strong> foi enviada:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p>O horário está reservado para você. Assim que o profissional confirmar, avisamos por
          e-mail. Se não houver confirmação em até 24 horas, o horário é liberado e você não
          paga nada.</p>`
    ),
  }
}

export function bookingRequestProfessional(d: AppointmentEmailData) {
  return {
    subject: `⏳ Nova solicitação: ${d.patientName} — ${d.dateLabel} às ${d.timeLabel}`,
    html: wrap(
      'Você tem uma solicitação de consulta',
      `<p><strong>${d.patientName}</strong> pediu uma consulta:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}<br/>
          💰 ${d.priceLabel}</p>
       <p><strong>Confirme em até 24 horas</strong>, na sua Agenda. Passado o prazo, o horário
          volta a ficar disponível para outros pacientes.</p>
       <p style="font-size: 13px; color: #6b7280;">
         A rapidez das suas confirmações conta pontos no seu posicionamento nas buscas.
       </p>`
    ),
  }
}

/**
 * Aviso de que alguém pediu um horário e está no meio do pagamento.
 *
 * Deliberadamente NÃO é um chamado para ação: enquanto a cobrança não é confirmada não há o
 * que o profissional possa aceitar, e pedir para ele confirmar agora só geraria confusão. O
 * pedido de verdade chega depois, em bookingRequestProfessional.
 *
 * Também não menciona prazo nem posicionamento na busca, ao contrário daquele: o relógio de
 * tempo de resposta só começa a correr em `paidAt` (ver lib/ranking.ts), então dizer "confirme
 * rápido" aqui cobraria pressa por um tempo que não está sendo medido.
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
       <p><strong>Você não precisa fazer nada agora.</strong> Assim que o pagamento for
          confirmado, você recebe a solicitação para aceitar — é a partir dali que conta o
          prazo de 24 horas.</p>
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
           ? `<p>O link da chamada abre 15 minutos antes do horário:<br/>
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

export function confirmationNudge(d: AppointmentEmailData & { hoursLeft: number }) {
  return {
    subject: `Ainda aguardando sua confirmação: ${d.patientName} — ${d.dateLabel}`,
    html: wrap(
      'Um agendamento está esperando você ⏳',
      `<p>Olá, ${d.professionalName}!</p>
       <p><strong>${d.patientName}</strong> pediu uma consulta e ela ainda não foi confirmada:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}</p>
       <p>Faltam cerca de <strong>${d.hoursLeft}h</strong> para o prazo. Passando disso, o horário
          volta a ficar disponível para outros pacientes.</p>
       <p>Confirme pela <em>Agenda</em> na plataforma.</p>`
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

export function paymentAuthorizedPatient(d: AppointmentEmailData) {
  return {
    subject: `Pagamento reservado: consulta com ${d.professionalName}`,
    html: wrap(
      'Recebemos seu pagamento 🔒',
      `<p>Olá, ${d.patientName}!</p>
       <p>O valor de <strong>${d.priceLabel}</strong> foi <strong>reservado</strong> no seu cartão para a
          consulta com <strong>${d.professionalName}</strong>:</p>
       <p>📅 <strong>${d.dateLabel}</strong> às <strong>${d.timeLabel}</strong><br/>
          💻 ${d.modalityLabel}</p>
       <p><strong>Ainda não houve cobrança.</strong> O valor só sai do seu cartão quando o profissional
          confirmar a consulta, o que costuma acontecer em até 24h. Se ele não confirmar, a reserva
          é liberada e nada é cobrado.</p>`
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
       <p>Confira o extrato e libere em <em>Financeiro</em> no painel administrativo. Enquanto
          isso, a consulta segue presa aguardando.</p>`
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
       <p>Está tudo certo do seu lado. Você recebe um aviso quando o profissional confirmar o
          horário.</p>`
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

// ── Conta ───────────────────────────────────────────────────────────────────

export function welcomePatient(d: { name: string; searchUrl: string }) {
  return {
    subject: 'Bem-vinda ao NutriMatch! 🥗',
    html: wrap(
      'Sua conta está pronta',
      `<p>Olá, ${d.name}!</p>
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
