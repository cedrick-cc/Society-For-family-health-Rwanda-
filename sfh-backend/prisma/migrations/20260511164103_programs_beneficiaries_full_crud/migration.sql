/*
  Warnings:

  - You are about to drop the column `createdById` on the `Beneficiary` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `Beneficiary` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Beneficiary` table. All the data in the column will be lost.
  - Added the required column `district` to the `Beneficiary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fullName` to the `Beneficiary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registeredById` to the `Beneficiary` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Beneficiary` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Beneficiary" DROP CONSTRAINT "Beneficiary_createdById_fkey";

-- DropForeignKey
ALTER TABLE "FieldReport" DROP CONSTRAINT "FieldReport_programId_fkey";

-- AlterTable
ALTER TABLE "Beneficiary" DROP COLUMN "createdById",
DROP COLUMN "location",
DROP COLUMN "name",
ADD COLUMN     "assignedProgramId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "district" TEXT NOT NULL,
ADD COLUMN     "fullName" TEXT NOT NULL,
ADD COLUMN     "householdSize" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "lastVisit" TIMESTAMP(3),
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "registeredById" TEXT NOT NULL,
ADD COLUMN     "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "riskLevel" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "servicesReceived" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "village" TEXT;

-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "budget" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "healthKits" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sector" TEXT,
ADD COLUMN     "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "targetBeneficiaries" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transportVehicles" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "volunteersRequired" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_assignedProgramId_fkey" FOREIGN KEY ("assignedProgramId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Beneficiary" ADD CONSTRAINT "Beneficiary_registeredById_fkey" FOREIGN KEY ("registeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldReport" ADD CONSTRAINT "FieldReport_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;
