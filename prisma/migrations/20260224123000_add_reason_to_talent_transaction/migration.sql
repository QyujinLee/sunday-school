-- CreateEnum
CREATE TYPE "TalentTransactionReason" AS ENUM ('ATTENDANCE', 'MANUAL_ADJUST');

-- AlterTable
ALTER TABLE "TalentTransaction" ADD COLUMN "reason" "TalentTransactionReason";

-- CreateIndex
CREATE INDEX "TalentTransaction_reason_transactedAt_idx" ON "TalentTransaction"("reason", "transactedAt");
