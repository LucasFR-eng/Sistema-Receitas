-- AlterEnum
ALTER TYPE "ImportType" ADD VALUE 'TEXT';

-- AlterTable
ALTER TABLE "recipe_imports" ADD COLUMN     "from_cache" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "file_url" DROP NOT NULL;
