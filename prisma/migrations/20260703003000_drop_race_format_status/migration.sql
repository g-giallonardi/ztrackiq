-- DropIndex
DROP INDEX IF EXISTS "Race_status_idx";

-- AlterTable
ALTER TABLE "Race" DROP COLUMN IF EXISTS "format";
ALTER TABLE "Race" DROP COLUMN IF EXISTS "status";
