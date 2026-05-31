-- AlterTable User: nationalId
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;

-- AlterTable Beneficiary: nationalId
ALTER TABLE "Beneficiary" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;

-- AlterTable Program: multi-district, age range, beneficiary category
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "districts" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "sectorsList" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "targetBeneficiaryCategory" TEXT;
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "minAge" INTEGER;
ALTER TABLE "Program" ADD COLUMN IF NOT EXISTS "maxAge" INTEGER;

-- CreateTable ScheduledActivityFieldManager
CREATE TABLE IF NOT EXISTS "ScheduledActivityFieldManager" (
    "scheduledActivityId" TEXT NOT NULL,
    "fieldManagerId" TEXT NOT NULL,

    CONSTRAINT "ScheduledActivityFieldManager_pkey" PRIMARY KEY ("scheduledActivityId","fieldManagerId")
);

CREATE INDEX IF NOT EXISTS "ScheduledActivityFieldManager_fieldManagerId_idx" ON "ScheduledActivityFieldManager"("fieldManagerId");

DO $$ BEGIN
  ALTER TABLE "ScheduledActivityFieldManager" ADD CONSTRAINT "ScheduledActivityFieldManager_scheduledActivityId_fkey" FOREIGN KEY ("scheduledActivityId") REFERENCES "ScheduledActivity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ScheduledActivityFieldManager" ADD CONSTRAINT "ScheduledActivityFieldManager_fieldManagerId_fkey" FOREIGN KEY ("fieldManagerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
