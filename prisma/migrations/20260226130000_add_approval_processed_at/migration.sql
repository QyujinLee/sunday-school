ALTER TABLE "Teacher"
ADD COLUMN "approvalProcessedAt" TIMESTAMP(3);

UPDATE "Teacher"
SET "approvalProcessedAt" = "updatedAt"
WHERE "approvalStatus" IN ('APPROVED', 'REJECTED')
  AND "approvalProcessedAt" IS NULL;
