import { PrismaClient } from '@prisma/client'
import { FREE_PLAN_SLUG, PRO_PLAN_SLUG } from '../lib/subscription'

// Separate from prisma/seed.ts on purpose: seed.ts creates demo people and refuses to run
// against production, but the subscription tiers are real configuration that production needs.
// This script is idempotent and safe to re-run on every deploy — it upserts by slug and never
// touches paymentLinkUrl, que o admin cadastra em /admin/links-de-pagamento.

const prisma = new PrismaClient()

const PLANS = [
  {
    slug: FREE_PLAN_SLUG,
    name: 'Gratuito',
    description:
      'Cadastro e perfil gratuitos. Não aparece na busca e não recebe agendamentos até a assinatura ser ativada.',
    monthlyPrice: 0,
    sponsored: false,
    canReceiveBookings: false,
    sortOrder: 0,
  },
  {
    slug: PRO_PLAN_SLUG,
    name: 'Profissional',
    description:
      'Aparece na busca, recebe agendamentos e entra no rodízio diário da faixa de destaque.',
    monthlyPrice: 990,
    sponsored: true,
    canReceiveBookings: true,
    sortOrder: 1,
  },
]

async function main() {
  for (const plan of PLANS) {
    const saved = await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      // Os campos paymentLink* estão de fora das duas ramificações de propósito: são
      // cadastrados à mão pelo admin, e rodar este script de novo nunca pode apagá-los.
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        sponsored: plan.sponsored,
        canReceiveBookings: plan.canReceiveBookings,
        sortOrder: plan.sortOrder,
        active: true,
      },
      create: plan,
    })
    const price = saved.monthlyPrice === 0 ? 'grátis' : `R$ ${(saved.monthlyPrice / 100).toFixed(2)}/mês`
    console.log(`✔ ${saved.slug.padEnd(14)} ${price.padEnd(18)} link=${saved.paymentLinkUrl ?? '(não cadastrado)'}`)
  }

  // Every professional needs a plan row so the rest of the code never has to special-case
  // "no subscription at all".
  const free = await prisma.subscriptionPlan.findUniqueOrThrow({ where: { slug: FREE_PLAN_SLUG } })
  const orphans = await prisma.professional.findMany({
    where: { subscription: null },
    select: { id: true },
  })
  if (orphans.length > 0) {
    await prisma.professionalSubscription.createMany({
      data: orphans.map((p) => ({ professionalId: p.id, planId: free.id, status: 'ACTIVE' as const })),
      skipDuplicates: true,
    })
  }
  console.log(`✔ ${orphans.length} profissional(is) colocado(s) no plano gratuito`)

  const enforced = process.env.SUBSCRIPTION_ENFORCED_FROM
  console.log(
    enforced
      ? `\nParedão de assinatura ativo a partir de ${enforced}.`
      : '\nSUBSCRIPTION_ENFORCED_FROM não está definida: todos os profissionais seguem recebendo agendamentos (carência aberta).'
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
