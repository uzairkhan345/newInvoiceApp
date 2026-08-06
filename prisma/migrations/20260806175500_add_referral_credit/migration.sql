-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "isReferralCredit" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "referralCreditEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "referralCreditLabel" TEXT;
