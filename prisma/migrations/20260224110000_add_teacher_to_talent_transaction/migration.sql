-- AlterTable
ALTER TABLE "TalentTransaction" ADD COLUMN "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "TalentTransaction_teacherId_idx" ON "TalentTransaction"("teacherId");

-- AddForeignKey
ALTER TABLE "TalentTransaction"
ADD CONSTRAINT "TalentTransaction_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
