import AdminSidebar from '../../components/AdminSidebar'
import DashboardShell from '../../components/DashboardShell'
import ComunicadosClient from './ComunicadosClient'
import { prisma } from '@/lib/prisma'
import { requireRoleOrRedirect } from '@/lib/session'

export const dynamic = 'force-dynamic'

export default async function Comunicados() {
  const user = await requireRoleOrRedirect('ADMIN')

  // Contagem por público, já descontando quem saiu da lista — é o número que o admin precisa
  // ver antes de apertar o botão, não o total de cadastrados.
  const [todos, profissionais, pacientes, descadastrados] = await Promise.all([
    prisma.user.count({ where: { notifyNews: true } }),
    prisma.user.count({ where: { notifyNews: true, role: 'PROFESSIONAL' } }),
    prisma.user.count({ where: { notifyNews: true, role: 'PATIENT' } }),
    prisma.user.count({ where: { notifyNews: false } }),
  ])

  return (
    <DashboardShell sidebar={<AdminSidebar name={user.name} />}>
      <ComunicadosClient
        counts={{ TODOS: todos, PROFISSIONAIS: profissionais, PACIENTES: pacientes }}
        descadastrados={descadastrados}
      />
    </DashboardShell>
  )
}
