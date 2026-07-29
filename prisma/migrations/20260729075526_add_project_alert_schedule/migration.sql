-- CreateTable
CREATE TABLE "ProjectAlertSchedule" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT true,
    "label" TEXT,
    "clearedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAlertSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectAlertSchedule_projectId_idx" ON "ProjectAlertSchedule"("projectId");

-- AddForeignKey
ALTER TABLE "ProjectAlertSchedule" ADD CONSTRAINT "ProjectAlertSchedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
