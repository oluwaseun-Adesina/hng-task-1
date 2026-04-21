-- AlterTable
ALTER TABLE "Profile" DROP COLUMN IF EXISTS "sample_size";
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "country_name" TEXT NOT NULL DEFAULT '';
