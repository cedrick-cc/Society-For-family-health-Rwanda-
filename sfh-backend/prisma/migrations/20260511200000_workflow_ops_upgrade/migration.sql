-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('HIV_AIDS_AWARENESS', 'MATERNAL_HEALTH', 'FAMILY_PLANNING', 'CHILD_NUTRITION', 'VACCINATION_CAMPAIGN');

-- CreateEnum
CREATE TYPE "VolunteerOpsStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'ON_LEAVE');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "skills" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "volunteerOpsStatus" "VolunteerOpsStatus" NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable Program: programType with default for existing rows
ALTER TABLE "Program" ADD COLUMN "programType" "ProgramType" NOT NULL DEFAULT 'MATERNAL_HEALTH';

-- Rename volunteersRequired -> volunteersNeeded
ALTER TABLE "Program" RENAME COLUMN "volunteersRequired" TO "volunteersNeeded";

-- Replace kit/vehicle columns with healthResources
ALTER TABLE "Program" ADD COLUMN "healthResources" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Program" DROP COLUMN "healthKits";
ALTER TABLE "Program" DROP COLUMN "transportVehicles";

-- Field manager
ALTER TABLE "Program" ADD COLUMN "fieldManagerId" TEXT;
ALTER TABLE "Program" ADD CONSTRAINT "Program_fieldManagerId_fkey" FOREIGN KEY ("fieldManagerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ProgramVolunteer
CREATE TABLE "ProgramVolunteer" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "volunteerId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgramVolunteer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgramVolunteer_programId_volunteerId_key" ON "ProgramVolunteer"("programId", "volunteerId");

CREATE INDEX "ProgramVolunteer_programId_idx" ON "ProgramVolunteer"("programId");

CREATE INDEX "ProgramVolunteer_volunteerId_idx" ON "ProgramVolunteer"("volunteerId");

ALTER TABLE "ProgramVolunteer" ADD CONSTRAINT "ProgramVolunteer_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramVolunteer" ADD CONSTRAINT "ProgramVolunteer_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProgramVolunteer" ADD CONSTRAINT "ProgramVolunteer_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
