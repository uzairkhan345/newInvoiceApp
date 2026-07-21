// @vitest-environment node
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  paymentMethodService,
  PaymentMethodDeletionBlockedError,
} from "@/services/paymentMethodService";
import { partyService } from "@/services/partyService";
import { prisma } from "@/lib/prisma";
import type { PaymentMethodInput } from "@/lib/validation/paymentMethod";
import type { PartyInput } from "@/lib/validation/party";

const createdPartyIds: string[] = [];
const createdProjectIds: string[] = [];

function basePartyInput(overrides: Partial<PartyInput> = {}): PartyInput {
  return {
    name: "[test] Party",
    email: "",
    type: "ORGANIZATION",
    street1: "",
    street2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    ...overrides,
  };
}

async function createTestParty(name: string) {
  const party = await partyService.create(basePartyInput({ name }));
  createdPartyIds.push(party.id);
  return party;
}

function baseInput(
  overrides: Partial<PaymentMethodInput> = {},
): PaymentMethodInput {
  return {
    type: "BANK_WIRE",
    label: "[test] Payment Method",
    isDefault: false,
    fields: [{ key: "bank_name", label: "Bank Name", value: "Test Bank" }],
    ...overrides,
  };
}

afterEach(async () => {
  if (createdProjectIds.length) {
    await prisma.project.deleteMany({
      where: { id: { in: createdProjectIds.splice(0) } },
    });
  }
  if (createdPartyIds.length) {
    // PaymentMethod.partyId cascades on Party delete (Docs/execution_plan.md §3).
    await prisma.party.deleteMany({
      where: { id: { in: createdPartyIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("paymentMethodService", () => {
  it("creates a payment method scoped to a party, preserving field order", async () => {
    const party = await createTestParty("[test] Ordered Fields Party");

    const method = await paymentMethodService.create(
      party.id,
      baseInput({
        fields: [
          { key: "bank_name", label: "Bank Name", value: "Deutsche Bank" },
          { key: "iban", label: "IBAN", value: "DE89..." },
          { key: "bic_swift", label: "BIC / SWIFT", value: "DEUTDEDDXXX" },
        ],
      }),
    );

    expect(method.partyId).toBe(party.id);

    const reloaded = await paymentMethodService.getById(method.id);
    const fields = reloaded!.fields as unknown as { key: string }[];
    expect(fields.map((f) => f.key)).toEqual([
      "bank_name",
      "iban",
      "bic_swift",
    ]);
  });

  it("lists payment methods for a party", async () => {
    const party = await createTestParty("[test] List Party");
    const other = await createTestParty("[test] Other Party");

    await paymentMethodService.create(party.id, baseInput({ label: "A" }));
    await paymentMethodService.create(party.id, baseInput({ label: "B" }));
    await paymentMethodService.create(other.id, baseInput({ label: "C" }));

    const list = await paymentMethodService.listForParty(party.id);
    expect(list.map((m) => m.label).sort()).toEqual(["A", "B"]);
  });

  it("enforces at most one default per party — marking a new default unsets the prior one", async () => {
    const party = await createTestParty("[test] Default Party");

    const first = await paymentMethodService.create(
      party.id,
      baseInput({ label: "First", isDefault: true }),
    );
    expect(first.isDefault).toBe(true);

    const second = await paymentMethodService.create(
      party.id,
      baseInput({ label: "Second", isDefault: true }),
    );
    expect(second.isDefault).toBe(true);

    const reloadedFirst = await paymentMethodService.getById(first.id);
    expect(reloadedFirst!.isDefault).toBe(false);

    // Re-saving the already-default row as default again shouldn't un-set itself.
    const updatedSecond = await paymentMethodService.update(
      second.id,
      party.id,
      baseInput({ label: "Second", isDefault: true }),
    );
    expect(updatedSecond.isDefault).toBe(true);
  });

  it("un-sets a party's default when a different method is edited to become default", async () => {
    const party = await createTestParty("[test] Edit Default Party");

    const first = await paymentMethodService.create(
      party.id,
      baseInput({ label: "First", isDefault: true }),
    );
    const second = await paymentMethodService.create(
      party.id,
      baseInput({ label: "Second", isDefault: false }),
    );

    await paymentMethodService.update(
      second.id,
      party.id,
      baseInput({ label: "Second", isDefault: true }),
    );

    const reloadedFirst = await paymentMethodService.getById(first.id);
    const reloadedSecond = await paymentMethodService.getById(second.id);
    expect(reloadedFirst!.isDefault).toBe(false);
    expect(reloadedSecond!.isDefault).toBe(true);
  });

  it("encrypts field values at rest (M17.5) — the raw DB row is ciphertext, the service returns plaintext", async () => {
    const party = await createTestParty("[test] Encryption Party");

    const method = await paymentMethodService.create(
      party.id,
      baseInput({
        fields: [
          { key: "account_number", label: "Account Number", value: "1234567890" },
        ],
      }),
    );

    // create() itself already returns decrypted plaintext.
    const createdFields = method.fields as unknown as {
      key: string;
      value: string;
    }[];
    expect(createdFields[0].value).toBe("1234567890");

    // The raw DB row (bypassing the service) must never hold plaintext.
    const raw = await prisma.paymentMethod.findUniqueOrThrow({
      where: { id: method.id },
    });
    const rawFields = raw.fields as unknown as { key: string; value: string }[];
    expect(rawFields[0].value).not.toBe("1234567890");

    // getById/listForParty decrypt back to the original plaintext.
    const reloaded = await paymentMethodService.getById(method.id);
    const reloadedFields = reloaded!.fields as unknown as {
      key: string;
      value: string;
    }[];
    expect(reloadedFields[0].value).toBe("1234567890");

    const listed = await paymentMethodService.listForParty(party.id);
    const listedFields = listed[0].fields as unknown as {
      key: string;
      value: string;
    }[];
    expect(listedFields[0].value).toBe("1234567890");
  });

  it("re-encrypts on update (M17.5) — a changed value is ciphertext at rest and decrypts back correctly", async () => {
    const party = await createTestParty("[test] Update Encryption Party");
    const method = await paymentMethodService.create(
      party.id,
      baseInput({
        fields: [{ key: "account_number", label: "Account Number", value: "old-value" }],
      }),
    );

    const updated = await paymentMethodService.update(
      method.id,
      party.id,
      baseInput({
        fields: [{ key: "account_number", label: "Account Number", value: "new-value" }],
      }),
    );
    const updatedFields = updated.fields as unknown as {
      key: string;
      value: string;
    }[];
    expect(updatedFields[0].value).toBe("new-value");

    const raw = await prisma.paymentMethod.findUniqueOrThrow({
      where: { id: method.id },
    });
    const rawFields = raw.fields as unknown as { key: string; value: string }[];
    expect(rawFields[0].value).not.toBe("new-value");
  });

  it("deletes an unreferenced payment method", async () => {
    const party = await createTestParty("[test] Deletable PM Party");
    const method = await paymentMethodService.create(party.id, baseInput());

    await expect(paymentMethodService.isDeletable(method.id)).resolves.toBe(
      true,
    );
    await expect(
      paymentMethodService.delete(method.id),
    ).resolves.toBeUndefined();
    await expect(paymentMethodService.getById(method.id)).resolves.toBeNull();
  });

  it("blocks deletion when set as a project's preferred payment method, and allows it once unreferenced", async () => {
    const contractor = await createTestParty("[test] PM Contractor");
    const client = await createTestParty("[test] PM Client");
    const method = await paymentMethodService.create(
      contractor.id,
      baseInput(),
    );

    const project = await prisma.project.create({
      data: {
        name: "[test] PM Project",
        clientId: client.id,
        contractorId: contractor.id,
        preferredPaymentMethodId: method.id,
        invoiceNumberFormat: "{number}",
        displayCurrency: "USD",
        status: "ACTIVE",
      },
    });
    createdProjectIds.push(project.id);

    await expect(paymentMethodService.isDeletable(method.id)).resolves.toBe(
      false,
    );
    await expect(paymentMethodService.delete(method.id)).rejects.toBeInstanceOf(
      PaymentMethodDeletionBlockedError,
    );

    await prisma.project.delete({ where: { id: project.id } });
    createdProjectIds.splice(createdProjectIds.indexOf(project.id), 1);

    await expect(paymentMethodService.isDeletable(method.id)).resolves.toBe(
      true,
    );
    await expect(
      paymentMethodService.delete(method.id),
    ).resolves.toBeUndefined();
  });
});
