-- Devolve as colunas do Stripe que a migration anterior derrubou.
--
-- POR QUE ISTO EXISTE
--
-- A migration `remove_stripe_e_link_da_mensalidade` derrubou as colunas no mesmo passo em que o
-- código deixou de usá-las. Isso só é seguro quando banco e código sobem juntos, e aqui eles
-- não sobem: o banco é compartilhado, e havia um container rodando código anterior que ainda
-- fazia `SELECT` nessas colunas. O resultado foi P2022 — "column does not exist" — na página
-- inicial e no painel do admin, com a aplicação no ar.
--
-- A ordem correta é expandir e contrair: primeiro o código para de usar a coluna e vai para
-- todos os ambientes; só depois a coluna cai, numa migration separada. Coluna sobrando no banco
-- e ausente no schema do Prisma é inofensiva — o Prisma só quebra no caminho contrário, quando
-- o schema pede algo que o banco não tem.
--
-- Por isso esta migration é compatível com os dois lados: devolve o que o código antigo espera
-- encontrar, e não atrapalha o código novo, que simplesmente ignora estas colunas.
--
-- Nenhum dado é recuperado porque não havia nenhum: todas estavam com zero valores não nulos
-- quando foram derrubadas. O que volta é só a estrutura.

ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT;
ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "stripeDisabledReason" TEXT;
ALTER TABLE "Professional" ADD COLUMN IF NOT EXISTS "stripeRequirementsDue" TEXT[] DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX IF NOT EXISTS "Professional_stripeAccountId_key" ON "Professional"("stripeAccountId");

ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "checkoutSessionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_paymentIntentId_key" ON "Appointment"("paymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Appointment_checkoutSessionId_key" ON "Appointment"("checkoutSessionId");

ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "paymentIntentId" TEXT;
ALTER TABLE "Enrollment" ADD COLUMN IF NOT EXISTS "checkoutSessionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_paymentIntentId_key" ON "Enrollment"("paymentIntentId");
CREATE UNIQUE INDEX IF NOT EXISTS "Enrollment_checkoutSessionId_key" ON "Enrollment"("checkoutSessionId");

ALTER TABLE "ProfessionalSubscription" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "ProfessionalSubscription" ADD COLUMN IF NOT EXISTS "stripeSubscriptionId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ProfessionalSubscription_stripeSubscriptionId_key" ON "ProfessionalSubscription"("stripeSubscriptionId");

ALTER TABLE "SubscriptionPlan" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_stripePriceId_key" ON "SubscriptionPlan"("stripePriceId");

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);
