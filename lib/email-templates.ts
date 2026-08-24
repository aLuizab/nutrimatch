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
