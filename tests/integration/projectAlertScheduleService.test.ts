// @vitest-environment node
import { afterAll, afterEach, describe, expect, it } from "vitest";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { partyService } from "@/services/partyService";
import { prisma } from "@/lib/prisma";
import type { ProjectAlertScheduleInput } from "@/lib/validation/projectAlertSchedule";
import type { PartyInput } from "@/lib/validation/party";
import type { ProjectStatus } from "@/generated/prisma/client";

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

async function createTestProject(
  name: string,
  status: ProjectStatus = "ACTIVE",
) {
  const contractor = await createTestParty(`${name} Contractor`);
  const client = await createTestParty(`${name} Client`);
  const project = await prisma.project.create({
    data: {
      name,
      clientId: client.id,
      contractorId: contractor.id,
      invoiceNumberFormat: "{number}",
      displayCurrency: "USD",
      status,
    },
  });
  createdProjectIds.push(project.id);
  return project;
}

function baseInput(
  overrides: Partial<ProjectAlertScheduleInput> = {},
): ProjectAlertScheduleInput {
  return {
    dayOfMonth: 1,
    recurring: true,
    label: "[test] Alert",
    ...overrides,
  };
}

afterEach(async () => {
  if (createdProjectIds.length) {
    // ProjectAlertSchedule.projectId cascades on Project delete.
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

describe("projectAlertScheduleService", () => {
  it("creates, updates, and deletes a schedule scoped to a project", async () => {
    const project = await createTestProject("[test] CRUD Project");

    const created = await projectAlertScheduleService.create(
      project.id,
      baseInput({ dayOfMonth: 15, recurring: false, label: "Follow up" }),
    );
    expect(created.projectId).toBe(project.id);
    expect(created.dayOfMonth).toBe(15);
    expect(created.recurring).toBe(false);
    expect(created.label).toBe("Follow up");
    expect(created.clearedAt).toBeNull();

    const updated = await projectAlertScheduleService.update(
      created.id,
      baseInput({ dayOfMonth: 20, recurring: true, label: "Updated" }),
    );
    expect(updated.dayOfMonth).toBe(20);
    expect(updated.recurring).toBe(true);
    expect(updated.label).toBe("Updated");

    await projectAlertScheduleService.delete(created.id);
    await expect(
      projectAlertScheduleService.getById(created.id),
    ).resolves.toBeNull();
  });

  it("normalizes a blank label to null", async () => {
    const project = await createTestProject("[test] Blank Label Project");

    const created = await projectAlertScheduleService.create(
      project.id,
      baseInput({ label: "   " }),
    );
    expect(created.label).toBeNull();
  });

  it("lists a project's schedules ordered by day of month", async () => {
    const project = await createTestProject("[test] Ordering Project");

    await projectAlertScheduleService.create(
      project.id,
      baseInput({ dayOfMonth: 16 }),
    );
    await projectAlertScheduleService.create(
      project.id,
      baseInput({ dayOfMonth: 1 }),
    );
    await projectAlertScheduleService.create(
      project.id,
      baseInput({ dayOfMonth: 8 }),
    );

    const list = await projectAlertScheduleService.listForProject(project.id);
    expect(list.map((s) => s.dayOfMonth)).toEqual([1, 8, 16]);
  });

  it("clear() sets clearedAt to now", async () => {
    const project = await createTestProject("[test] Clear Project");
    const created = await projectAlertScheduleService.create(
      project.id,
      baseInput(),
    );
    expect(created.clearedAt).toBeNull();

    const before = new Date();
    const cleared = await projectAlertScheduleService.clear(created.id);
    expect(cleared.clearedAt).not.toBeNull();
    expect(cleared.clearedAt!.getTime()).toBeGreaterThanOrEqual(
      before.getTime() - 1000,
    );
  });

  it("listForProjectWithFiringState flags a schedule on today's day as fired", async () => {
    // The exhaustive calendar/clamping truth table is covered by
    // tests/unit/alertScheduleFiring.test.ts with an injected `now`; this
    // integration test only needs to confirm the DB row + service wiring —
    // a schedule dated today's actual day-of-month always fires (day <=
    // today is always true when day === today), regardless of when this
    // suite runs.
    const project = await createTestProject("[test] Firing State Project");
    const todayDay = new Date().getUTCDate();

    await projectAlertScheduleService.create(
      project.id,
      baseInput({ dayOfMonth: todayDay, label: "Should be fired" }),
    );

    const withState =
      await projectAlertScheduleService.listForProjectWithFiringState(
        project.id,
      );
    expect(withState).toHaveLength(1);
    expect(withState[0].isFired).toBe(true);
  });

  it("listFiredAcrossActiveProjects excludes an ARCHIVED project's otherwise-firing schedule", async () => {
    // dayOfMonth must be today's actual day — a freshly-created schedule
    // never fires for an already-passed day within its creation month (see
    // tests/unit/alertScheduleFiring.test.ts), so a hardcoded day would
    // only "otherwise-fire" when the suite happened to run on that date.
    const todayDay = new Date().getUTCDate();
    const activeProject = await createTestProject(
      "[test] Active Fired Project",
      "ACTIVE",
    );
    const archivedProject = await createTestProject(
      "[test] Archived Fired Project",
      "ARCHIVED",
    );

    await projectAlertScheduleService.create(
      activeProject.id,
      baseInput({ dayOfMonth: todayDay, label: "[test] active fired" }),
    );
    await projectAlertScheduleService.create(
      archivedProject.id,
      baseInput({ dayOfMonth: todayDay, label: "[test] archived fired" }),
    );

    const fired =
      await projectAlertScheduleService.listFiredAcrossActiveProjects();
    const labels = fired.map((s) => s.label);

    expect(labels).toContain("[test] active fired");
    expect(labels).not.toContain("[test] archived fired");
  });
});
