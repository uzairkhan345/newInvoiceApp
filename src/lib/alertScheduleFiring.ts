/**
 * M29 — pure firing logic for ProjectAlertSchedule, no DB dependency.
 * UTC-anchored, matching invoicePeriod.ts's clamping convention (avoids
 * local-timezone drift). `clearedAt` is the entire "already fired" state
 * machine: for a recurring schedule, cleared-this-month hides it and
 * cleared-in-an-earlier-month re-arms it automatically; for a one-time
 * schedule, any non-null value hides it permanently regardless of date.
 */

/** Last day of the given UTC month (0-indexed, may be passed as 12 to mean "next January"). */
function daysInUtcMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** The day this month a schedule's `dayOfMonth` resolves to, clamped to the month's last day (e.g. 31 -> Feb 28/29). */
export function resolveScheduledDayThisMonth(dayOfMonth: number, now: Date): number {
  return Math.min(dayOfMonth, daysInUtcMonth(now.getUTCFullYear(), now.getUTCMonth()));
}

function isSameUtcMonth(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth()
  );
}

export type AlertFiringInput = {
  dayOfMonth: number;
  recurring: boolean;
  clearedAt: Date | null;
};

/**
 * Whether this alert schedule is currently "fired and uncleared."
 * Recurring alerts auto re-arm every month; one-time alerts, once cleared,
 * never fire again regardless of any future date.
 */
export function isAlertCurrentlyFired(
  input: AlertFiringInput,
  now: Date = new Date(),
): boolean {
  const dayHasArrived = now.getUTCDate() >= resolveScheduledDayThisMonth(input.dayOfMonth, now);
  if (!dayHasArrived) return false;

  if (!input.recurring) {
    return input.clearedAt === null;
  }

  if (input.clearedAt === null) return true;
  return !isSameUtcMonth(input.clearedAt, now);
}
