"use server";

import { revalidatePath } from "next/cache";
import { projectAlertScheduleService } from "@/services/projectAlertScheduleService";
import { projectAlertScheduleSchema } from "@/lib/validation/projectAlertSchedule";

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Revalidates both the owning project's page and the dashboard — the
 * dashboard Priority Feed reads the same fired-alert set, so this is what
 * makes "clear from either place reflects everywhere" actually true.
 */
function revalidateAlertSchedulePaths(projectId: string): void {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/");
}

export async function createProjectAlertScheduleAction(
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = projectAlertScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const schedule = await projectAlertScheduleService.create(projectId, parsed.data);
  revalidateAlertSchedulePaths(projectId);
  return { success: true, data: { id: schedule.id } };
}

export async function updateProjectAlertScheduleAction(
  id: string,
  projectId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = projectAlertScheduleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const schedule = await projectAlertScheduleService.update(id, parsed.data);
  revalidateAlertSchedulePaths(projectId);
  return { success: true, data: { id: schedule.id } };
}

export async function deleteProjectAlertScheduleAction(
  id: string,
  projectId: string,
): Promise<ActionResult<null>> {
  await projectAlertScheduleService.delete(id);
  revalidateAlertSchedulePaths(projectId);
  return { success: true, data: null };
}

export async function clearProjectAlertScheduleAction(
  id: string,
  projectId: string,
): Promise<ActionResult<null>> {
  await projectAlertScheduleService.clear(id);
  revalidateAlertSchedulePaths(projectId);
  return { success: true, data: null };
}
