-- AlterEnum
-- Só adiciona o valor, nunca o usa nesta mesma transação: no Postgres um valor de enum criado
-- dentro da transação não pode ser referenciado por ela. Quem passa a gravar PROCESSING é o
-- código, depois do deploy.
--
-- AFTER 'PENDING' e não só ADD VALUE: sem posição o Postgres anexa o valor no FIM da ordem do
-- tipo, e a ordem do tipo é o que um ORDER BY sobre a coluna usa. O enum ficaria ordenando
-- PENDING, PAID, CANCELLED, PROCESSING — diferente do que o schema.prisma declara, o que é
-- exatamente o tipo de divergência que ninguém procura quando a lista sai fora de ordem.
ALTER TYPE "PayoutStatus" ADD VALUE 'PROCESSING' AFTER 'PENDING';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN     "receiptFileId" TEXT,
ADD COLUMN     "sentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoredFile" (
    "id" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "bytes" BYTEA NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoredFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoredFile_uploadedBy_createdAt_idx" ON "StoredFile"("uploadedBy", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_receiptFileId_key" ON "Payout"("receiptFileId");

-- AddForeignKey
ALTER TABLE "Payout" ADD CONSTRAINT "Payout_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Dados: consultas presas num aceite que deixou de existir ──────────────────────────────
--
-- Até este deploy, uma consulta paga ficava AWAITING_CONFIRMATION esperando o profissional
-- aceitar, e o horário era mantido preso por confirmationDeadline. O código novo lê
-- AWAITING_CONFIRMATION como "aguardando pagamento" e só reconhece o prazo quando o pagamento
-- está PENDING ou AWAITING_REVIEW. Sem esta conversão, toda consulta já paga e ainda não aceita
-- deixaria de ocupar a agenda no instante do deploy: o horário voltaria a aparecer livre e
-- poderia ser vendido duas vezes.
--
-- A conversão é a própria regra nova aplicada ao passado: pagamento conferido é consulta
-- marcada. Mesma coisa para NOT_REQUIRED, que agora já nasce confirmada.
--
-- Só consulta futura. Uma que já passou sem ninguém aceitar não tem agenda a proteger, e
-- transformá-la em CONFIRMED inventaria uma consulta realizada que não aconteceu — ela continua
-- sendo lida como expirada, que é o que foi.
UPDATE "Appointment"
SET "status" = 'CONFIRMED',
    "confirmedAt" = COALESCE("confirmedAt", "paidAt", CURRENT_TIMESTAMP),
    "confirmationDeadline" = NULL
WHERE "status" = 'AWAITING_CONFIRMATION'
  AND "paymentStatus" IN ('PAID', 'NOT_REQUIRED')
  AND "scheduledAt" > CURRENT_TIMESTAMP;

-- medianResponseSecs para de ser alimentada (ver o comentário no schema). Zerar aqui evita que
-- um número velho continue sendo exibido caso alguma leitura escape — o valor descrevia o tempo
-- de resposta de uma etapa que não existe mais.
UPDATE "Professional" SET "medianResponseSecs" = NULL WHERE "medianResponseSecs" IS NOT NULL;
