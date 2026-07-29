/** M29 — shared between AlertScheduleForm (the day-of-month Select) and AlertScheduleRow (display). */
function ordinal(day: number): string {
  if (day % 10 === 1 && day % 100 !== 11) return `${day}st`;
  if (day % 10 === 2 && day % 100 !== 12) return `${day}nd`;
  if (day % 10 === 3 && day % 100 !== 13) return `${day}rd`;
  return `${day}th`;
}

export const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1);
export const DAY_LABELS: Record<number, string> = Object.fromEntries(
  DAY_OPTIONS.map((day) => [day, ordinal(day)]),
);
