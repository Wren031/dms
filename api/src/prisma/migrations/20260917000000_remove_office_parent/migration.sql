-- DropForeignKey
ALTER TABLE "Office" DROP CONSTRAINT "Office_parentId_fkey";

-- DropIndex
DROP INDEX "Office_parentId_idx";

-- AlterTable
ALTER TABLE "Office" DROP COLUMN "parentId";