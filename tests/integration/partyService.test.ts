// @vitest-environment node
import { afterAll, afterEach, describe, expect, it } from "vitest";
import {
  partyService,
  PartyDeletionBlockedError,
} from "@/services/partyService";
import { prisma } from "@/lib/prisma";
import type { PartyInput } from "@/lib/validation/party";

const createdPartyIds: string[] = [];
const createdProjectIds: string[] = [];

function baseInput(overrides: Partial<PartyInput> = {}): PartyInput {
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

afterEach(async () => {
  if (createdProjectIds.length) {
    await prisma.project.deleteMany({
      where: { id: { in: createdProjectIds.splice(0) } },
    });
  }
  if (createdPartyIds.length) {
    await prisma.party.deleteMany({
      where: { id: { in: createdPartyIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("partyService", () => {
  it("creates a party with all fields, including address", async () => {
    const party = await partyService.create(
      baseInput({
        name: "Test Contractor LLC",
        email: "hello@test-contractor.example",
        type: "ORGANIZATION",
        street1: "1 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "USA",
      }),
    );
    createdPartyIds.push(party.id);

    expect(party.name).toBe("Test Contractor LLC");
    expect(party.email).toBe("hello@test-contractor.example");
    expect(party.street1).toBe("1 Main St");
    expect(party.city).toBe("Springfield");
  });

  it("creates a party with empty optional fields stored as null, not empty string", async () => {
    const party = await partyService.create(baseInput({ name: "Bare Party" }));
    createdPartyIds.push(party.id);

    expect(party.email).toBeNull();
    expect(party.street1).toBeNull();
    expect(party.city).toBeNull();
  });

  it("updates a party's fields", async () => {
    const party = await partyService.create(
      baseInput({ name: "Original Name" }),
    );
    createdPartyIds.push(party.id);

    const updated = await partyService.update(
      party.id,
      baseInput({ name: "Renamed", city: "Austin" }),
    );

    expect(updated.name).toBe("Renamed");
    expect(updated.city).toBe("Austin");
  });

  it("clears a previously-set optional field to null when edited to empty", async () => {
    const party = await partyService.create(
      baseInput({ name: "Has Email", email: "old@test.example" }),
    );
    createdPartyIds.push(party.id);
    expect(party.email).toBe("old@test.example");

    const updated = await partyService.update(
      party.id,
      baseInput({ name: "Has Email", email: "" }),
    );
    expect(updated.email).toBeNull();
  });

  it("deletes an unreferenced party", async () => {
    const party = await partyService.create(baseInput({ name: "Deletable" }));

    await expect(partyService.isDeletable(party.id)).resolves.toBe(true);
    await expect(partyService.delete(party.id)).resolves.toBeUndefined();
    await expect(partyService.getById(party.id)).resolves.toBeNull();
  });

  it("blocks deletion when the party is a project's contractor or client, and allows it once unreferenced", async () => {
    const contractor = await partyService.create(
      baseInput({ name: "[test] Contractor" }),
    );
    const client = await partyService.create(
      baseInput({ name: "[test] Client" }),
    );
    createdPartyIds.push(contractor.id, client.id);

    const project = await prisma.project.create({
      data: {
        name: "[test] Project",
        clientId: client.id,
        contractorId: contractor.id,
        invoiceNumberFormat: "{number}",
        displayCurrency: "USD",
        status: "ACTIVE",
      },
    });
    createdProjectIds.push(project.id);

    await expect(partyService.isDeletable(contractor.id)).resolves.toBe(false);
    await expect(partyService.isDeletable(client.id)).resolves.toBe(false);
    await expect(partyService.delete(contractor.id)).rejects.toBeInstanceOf(
      PartyDeletionBlockedError,
    );
    await expect(partyService.delete(client.id)).rejects.toBeInstanceOf(
      PartyDeletionBlockedError,
    );

    // Unreferencing the project's contractor/client unblocks deletion.
    await prisma.project.delete({ where: { id: project.id } });
    createdProjectIds.splice(createdProjectIds.indexOf(project.id), 1);

    await expect(partyService.isDeletable(contractor.id)).resolves.toBe(true);
    await expect(partyService.delete(contractor.id)).resolves.toBeUndefined();
    createdPartyIds.splice(createdPartyIds.indexOf(contractor.id), 1);
  });
});
