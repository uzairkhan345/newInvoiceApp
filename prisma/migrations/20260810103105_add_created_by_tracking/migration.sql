-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "createdByUserId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "createdByUserId" TEXT;

-- CreateIndex
CREATE INDEX "Invoice_createdByUserId_idx" ON "Invoice"("createdByUserId");

-- CreateIndex
CREATE INDEX "Project_createdByUserId_idx" ON "Project"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
