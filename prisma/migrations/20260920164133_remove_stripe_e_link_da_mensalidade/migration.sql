-- Remove a integração com o Stripe e adiciona o link de cobrança da mensalidade.
--
-- Escrita à mão de propósito. `prisma migrate dev` recusou gerar esta migration porque detectou
-- drift: a tabela `nutrimatch_lista_espera`, da landing de captação, divide este banco e não
-- está no schema do Prisma. A saída que o Prisma oferece nesse caso é resetar o banco, o que
-- apagaria User, Professional, Appointment e todo o resto. A tabela da landing não é tocada
-- aqui e deve continuar fora do schema — é justamente o isolamento que o README dela defende.
--
-- Seguro quanto a perda de dados: antes de escrever isto, contei as linhas de cada coluna
-- abaixo. Todas tinham zero valores não nulos — a integração nunca foi exercitada.

-- Consulta: autorizar agora e capturar depois era recurso do Stripe. O link do InfinitePay
-- cobra à vista, então não há intenção de pagamento nem sessão de checkout a guardar.
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "paymentIntentId";
ALTER TABLE "Appointment" DROP COLUMN IF EXISTS "checkoutSessionId";

-- Pacote: mesma coisa.
ALTER TABLE "Enrollment" DROP COLUMN IF EXISTS "paymentIntentId";
ALTER TABLE "Enrollment" DROP COLUMN IF EXISTS "checkoutSessionId";

-- Stripe Connect: o repasse ao profissional é feito por Pix, à mão, e a chave Pix já cumpre
-- esse papel. Nenhum profissional chegou a ter conta conectada.
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "stripeAccountId";
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "stripeChargesEnabled";
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "stripePayoutsEnabled";
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "stripeDisabledReason";
ALTER TABLE "Professional" DROP COLUMN IF EXISTS "stripeRequirementsDue";

-- Assinatura: nunca houve cliente nem assinatura no Stripe. A mensalidade é paga por link e
-- confirmada por um admin, como já acontecia de fato.
ALTER TABLE "ProfessionalSubscription" DROP COLUMN IF EXISTS "stripeCustomerId";
ALTER TABLE "ProfessionalSubscription" DROP COLUMN IF EXISTS "stripeSubscriptionId";

-- Plano: o id de preço recorrente do Stripe dá lugar ao link que cobra a mensalidade, no mesmo
-- formato já usado no link por profissional e no link por pacote.
ALTER TABLE "SubscriptionPlan" DROP COLUMN IF EXISTS "stripePriceId";
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "paymentLinkUrl" TEXT;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "paymentLinkAmount" INTEGER;
ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "paymentLinkUpdatedAt" TIMESTAMP(3);

-- A tabela existia só para deduplicar evento de webhook do Stripe, que era reentregue pelo
-- mesmo id por até 3 dias. Sem webhook, não há o que deduplicar.
DROP TABLE IF EXISTS "WebhookEvent";
