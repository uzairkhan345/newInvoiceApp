-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "sortOrder" INTEGER;

-- Backfill: preserve current alphabetical order as the starting manual order.
UPDATE "Project" AS p
SET "sortOrder" = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM "Project"
) AS sub
WHERE p.id = sub.id;

ALTER TABLE "Project" ALTER COLUMN "sortOrder" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Project_sortOrder_idx" ON "Project"("sortOrder");
