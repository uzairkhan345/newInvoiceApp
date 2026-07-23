-- CreateEnum
CREATE TYPE "ProjectCurrencyMode" AS ENUM ('SINGLE', 'DUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DisplayCurrency" ADD VALUE 'NZD';
ALTER TYPE "DisplayCurrency" ADD VALUE 'AED';
ALTER TYPE "DisplayCurrency" ADD VALUE 'PKR';
ALTER TYPE "DisplayCurrency" ADD VALUE 'SAR';

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "currency" "DisplayCurrency" NOT NULL DEFAULT 'USD';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "currencyMode" "ProjectCurrencyMode" NOT NULL DEFAULT 'SINGLE';

-- DataMigration: Docs/feedback_backlog.md M26 — every project already using a
-- non-USD displayCurrency was, by definition, already on today's existing
-- USD-primary + converted-total behavior. Backfill those to DUAL so their
-- behavior is unchanged after this migration; every USD project keeps the
-- SINGLE default above, also unchanged. Invoice.currency's DEFAULT 'USD'
-- above already matches every existing invoice's actual reality (subtotal/
-- total are always USD before this migration), so no Invoice backfill needed.
UPDATE "Project" SET "currencyMode" = 'DUAL' WHERE "displayCurrency" != 'USD';
