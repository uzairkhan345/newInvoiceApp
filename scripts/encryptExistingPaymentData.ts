/**
 * One-time migration for Docs/feedback_backlog.md M17.5 — encrypts the
 * plaintext banking details that already exist in the real dev DB, now that
 * `paymentMethodService`/`documentService` read and write `.value` as
 * ciphertext. Covers both:
 *   1. Every PaymentMethod.fields[].value (the live source of truth).
 *   2. Every Invoice.paymentDetailsSnapshot[].value that isn't an empty array
 *      (locked-in copies on already-DRAFT/SENT/PAID/VOID invoices) — these
 *      are read directly by documentService's render path, so an
 *      unmigrated plaintext snapshot would fail to decrypt the next time
 *      that invoice is viewed/printed/downloaded.
 *
 * Idempotent and safe to re-run: a value is only encrypted if it does NOT
 * already decrypt successfully (a plaintext value like "Test Bank" fails
 * AES-GCM auth-tag verification with overwhelming probability, so this
 * reliably distinguishes "already migrated" from "still plaintext").
 *
 * Run with: node --env-file=.env.local -r tsx/cjs scripts/encryptExistingPaymentData.ts
 */
import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret } from "@/lib/crypto/settingsEncryption";
import type { PaymentMethodField } from "@/repositories/paymentMethodRepository";

function isAlreadyEncrypted(value: string): boolean {
  try {
    decryptSecret(value);
    return true;
  } catch {
    return false;
  }
}

function migrateFields(fields: PaymentMethodField[]): {
  fields: PaymentMethodField[];
  changed: boolean;
} {
  let changed = false;
  const migrated = fields.map((field) => {
    if (isAlreadyEncrypted(field.value)) return field;
    changed = true;
    return { ...field, value: encryptSecret(field.value) };
  });
  return { fields: migrated, changed };
}

async function migratePaymentMethods() {
  const methods = await prisma.paymentMethod.findMany();
  let updated = 0;
  for (const method of methods) {
    const { fields, changed } = migrateFields(
      method.fields as unknown as PaymentMethodField[],
    );
    if (!changed) continue;
    await prisma.paymentMethod.update({
      where: { id: method.id },
      data: { fields },
    });
    updated += 1;
  }
  console.log(`PaymentMethod: ${updated}/${methods.length} rows encrypted.`);
}

async function migrateInvoiceSnapshots() {
  const invoices = await prisma.invoice.findMany({
    select: { id: true, paymentDetailsSnapshot: true },
  });
  let updated = 0;
  for (const invoice of invoices) {
    const snapshot =
      invoice.paymentDetailsSnapshot as unknown as PaymentMethodField[];
    if (!Array.isArray(snapshot) || snapshot.length === 0) continue;
    const { fields, changed } = migrateFields(snapshot);
    if (!changed) continue;
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { paymentDetailsSnapshot: fields },
    });
    updated += 1;
  }
  console.log(`Invoice: ${updated}/${invoices.length} rows encrypted.`);
}

async function main() {
  await migratePaymentMethods();
  await migrateInvoiceSnapshots();
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
