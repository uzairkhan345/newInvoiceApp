-- CreateEnum
CREATE TYPE "InvoicePeriodType" AS ENUM ('WEEKLY', 'SEMI_MONTHLY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "invoicePeriodType" "InvoicePeriodType";
