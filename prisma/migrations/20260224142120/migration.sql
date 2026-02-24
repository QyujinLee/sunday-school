-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Relationship" ADD VALUE 'GRANDFATHER';
ALTER TYPE "Relationship" ADD VALUE 'GRANDMOTHER';
ALTER TYPE "Relationship" ADD VALUE 'ETC';
