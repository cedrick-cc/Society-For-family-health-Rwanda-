-- AlterTable
ALTER TABLE "FieldReport" ADD COLUMN     "reviewNotes" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "completionNotes" TEXT,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progressHistory" JSONB NOT NULL DEFAULT '[]';

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
