ALTER TABLE "ParentContact" RENAME TO "GuardianContact";

ALTER TABLE "GuardianContact" RENAME CONSTRAINT "ParentContact_pkey" TO "GuardianContact_pkey";
ALTER TABLE "GuardianContact" RENAME CONSTRAINT "ParentContact_studentId_fkey" TO "GuardianContact_studentId_fkey";
ALTER INDEX "ParentContact_studentId_key" RENAME TO "GuardianContact_studentId_key";
