import type { Goal } from '@prisma/client'
import { prisma } from './prisma'

// Metas do paciente — o acompanhamento concreto, com prazo e progresso.
//
// Separado de Patient.goal de propósito: aquele é o objetivo genérico escolhido no cadastro
// ("Emagrecimento"), usado em busca e triagem, e não tem como registrar evolução. Os dois
// coexistem porque respondem perguntas diferentes: "o que esta pessoa procura" e "onde ela
// está agora".

/**
 * Quem pode criar e editar metas de um paciente.
 *
 * Para o profissional a regra é a mesma que abre o prontuário em /pacientes/[id]: ter ao menos
 * uma consulta confirmada com aquele paciente. Vínculo por matrícula ativa faria a meta sumir
 * no dia em que o programa acabasse, que é justamente quando acompanhar ainda importa.
 */
export type GoalActor = {
  id: string
  patient?: { id: string } | null
  professional?: { id: string } | null
}

export async function canManageGoalsFor(patientId: string, actor: GoalActor): Promise<boolean> {
  // O próprio paciente sempre pode. Vale para admin e nutricionista que também se consultam:
  // quem manda é o perfil de paciente existir, não o papel na sessão.
  if (actor.patient?.id === patientId) return true

  if (actor.professional) {
    const consultas = await prisma.appointment.count({
      where: { patientId, professionalId: actor.professional.id, status: "CONFIRMED" },
    })
    return consultas > 0
  }
  return false
}

/**
 * Progresso 0..1, ou null quando a meta não é numérica.
 *
 * Funciona nos dois sentidos: emagrecer é uma meta decrescente (85 → 72) e beber água é
 * crescente (0 → 2L). Sem tratar o caso decrescente, quem está perdendo peso veria a barra
 * andar para trás a cada quilo perdido.
 */
export function goalProgress(goal: Pick<Goal, 'targetValue' | 'currentValue' | 'startValue'>): number | null {
  const { targetValue, currentValue, startValue } = goal
  if (targetValue == null || currentValue == null) return null
  const start = startValue ?? currentValue
  if (start === targetValue) return currentValue === targetValue ? 1 : 0

  const done = (currentValue - start) / (targetValue - start)
  return Math.max(0, Math.min(1, done))
}

export function isOverdue(goal: Pick<Goal, 'dueDate' | 'status'>, now: Date = new Date()): boolean {
  return goal.status === 'ACTIVE' && goal.dueDate != null && goal.dueDate < now
}
