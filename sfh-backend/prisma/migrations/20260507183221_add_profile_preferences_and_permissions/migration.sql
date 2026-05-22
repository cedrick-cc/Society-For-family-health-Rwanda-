-- CreateEnum
CREATE TYPE "PermissionModule" AS ENUM ('DASHBOARD', 'PROGRAMS', 'VOLUNTEERS', 'BENEFICIARIES', 'GEOGRAPHIC', 'ANALYTICS', 'USER_MANAGEMENT', 'SYSTEM_SETTINGS', 'AUDIT_LOGS', 'ANNOUNCEMENTS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "programUpdates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "volunteerActivity" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "module" "PermissionModule" NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_role_module_key" ON "Permission"("role", "module");
