import { randomBytes } from 'crypto'

// Video consultations via Jitsi Meet: no OAuth, no account, no SDK, works in the browser and
// on mobile. The trade-off versus Google Meet is that a public Jitsi room has NO access list —
// anyone who knows the room name can walk in. That makes the room name the entire access
// control for a health consultation, so it must be long and random, never derived from the
// appointment id or the participants' names.

const JITSI_HOST = process.env.JITSI_HOST?.replace(/\/$/, '') || 'https://meet.jit.si'

export function generateMeetingRoom(): string {
  // 160 bits — far beyond guessable, and Jitsi accepts it as a room name.
  return `nutrimatch-${randomBytes(20).toString('hex')}`
}

export function meetingUrl(room: string): string {
  return `${JITSI_HOST}/${room}`
}

/**
 * The join window. Opening the room early enough to arrive on time, and keeping it open past
 * the end so an overrunning consultation isn't cut off, while never leaving a health
 * consultation's room reachable indefinitely.
 */
// Exportada porque a tela precisa dizer "abre 5 minutos antes" ao lado do botão. Repetir o
// número no texto é como ele envelhece: alguém ajusta a regra aqui e a tela segue prometendo
// outra coisa.
export const OPEN_BEFORE_MINUTES = 5
const OPEN_AFTER_MINUTES = 120

export function isMeetingOpen(scheduledAt: Date, now: Date = new Date()): boolean {
  const start = scheduledAt.getTime() - OPEN_BEFORE_MINUTES * 60 * 1000
  const end = scheduledAt.getTime() + OPEN_AFTER_MINUTES * 60 * 1000
  return now.getTime() >= start && now.getTime() <= end
}

export function minutesUntilOpen(scheduledAt: Date, now: Date = new Date()): number {
  const start = scheduledAt.getTime() - OPEN_BEFORE_MINUTES * 60 * 1000
  return Math.max(0, Math.ceil((start - now.getTime()) / 60000))
}
