import { projectAlertScheduleRepository } from "@/repositories/projectAlertScheduleRepository";
import type {
  ProjectAlertScheduleWriteInput,
  AlertScheduleWithProject,
} from "@/repositories/projectAlertScheduleRepository";
import type { ProjectAlertScheduleInput } from "@/lib/validation/projectAlertSchedule";
import type { ProjectAlertSchedule } from "@/generated/prisma/client";
import { isAlertCurrentlyFired } from "@/lib/alertScheduleFiring";

export type ProjectAlertScheduleWithFiringState = ProjectAlertSchedule & {
  isFired: boolean;
};

function toWriteInput(
  projectId: string,
  input: ProjectAlertScheduleInput,
): ProjectAlertScheduleWriteInput {
  return {
    projectId,
    dayOfMonth: input.dayOfMonth,
    recurring: input.recurring,
    label: input.label?.trim() ? input.label.trim() : null,
  };
}

function listForProject(projectId: string): Promise<ProjectAlertSchedule[]> {
  return projectAlertScheduleRepository.findByProject(projectId);
}

/**
 * All of a project's configured schedules, each with its current
 * fired/uncleared state attached — computed server-side (a single "now") so
 * the client never needs its own clock.
 */
async function listForProjectWithFiringState(
  projectId: string,
): Promise<ProjectAlertScheduleWithFiringState[]> {
  const schedules = await projectAlertScheduleRepository.findByProject(projectId);
  const now = new Date();
  return schedules.map((schedule) => ({
    ...schedule,
    isFired: isAlertCurrentlyFired(schedule, now),
  }));
}

function getById(id: string): Promise<ProjectAlertSchedule | null> {
  return projectAlertScheduleRepository.findById(id);
}

function create(
  projectId: string,
  input: ProjectAlertScheduleInput,
): Promise<ProjectAlertSchedule> {
  return projectAlertScheduleRepository.create(toWriteInput(projectId, input));
}

function update(
  id: string,
  input: ProjectAlertScheduleInput,
): Promise<ProjectAlertSchedule> {
  return projectAlertScheduleRepository.update(id, {
    dayOfMonth: input.dayOfMonth,
    recurring: input.recurring,
    label: input.label?.trim() ? input.label.trim() : null,
  });
}

function deleteSchedule(id: string): Promise<void> {
  return projectAlertScheduleRepository.delete(id).then(() => undefined);
}

/** Clearing dismisses just the current occurrence — see alertScheduleFiring.ts for what happens next. */
function clear(id: string): Promise<ProjectAlertSchedule> {
  return projectAlertScheduleRepository.clear(id, new Date());
}

/**
 * The single source of truth both the dashboard Priority Feed and each
 * project's own detail page ultimately read through for "what's currently
 * fired and uncleared." Scoped to ACTIVE projects only — an archived
 * project shouldn't keep nagging the dashboard, matching the precedent set
 * by the missing-payment-method dashboard query and M25's "Used by" tags.
 */
async function listFiredAcrossActiveProjects(): Promise<AlertScheduleWithProject[]> {
  const candidates =
    await projectAlertScheduleRepository.findFireableAcrossActiveProjects();
  const now = new Date();
  return candidates.filter((schedule) => isAlertCurrentlyFired(schedule, now));
}

/**
 * Dashboard "next invoice date" — every schedule that could still occur
 * across ACTIVE projects (recurring, or one-time and not yet cleared),
 * unfiltered by current firing state, unlike listFiredAcrossActiveProjects
 * above. A project can have more than one; callers resolve each schedule's
 * own next occurrence (`resolveNextOccurrence`, alertScheduleFiring.ts) and
 * take the earliest per project.
 */
function listLiveAcrossActiveProjects(): Promise<AlertScheduleWithProject[]> {
  return projectAlertScheduleRepository.findFireableAcrossActiveProjects();
}

export const projectAlertScheduleService = {
  listForProject,
  listForProjectWithFiringState,
  getById,
  create,
  update,
  delete: deleteSchedule,
  clear,
  listFiredAcrossActiveProjects,
  listLiveAcrossActiveProjects,
};
