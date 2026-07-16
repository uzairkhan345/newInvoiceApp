-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "bottomNote" TEXT,
ADD COLUMN     "itemsNote" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "isFlatAmount" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "quantity" DROP NOT NULL,
ALTER COLUMN "unitPrice" DROP NOT NULL;
