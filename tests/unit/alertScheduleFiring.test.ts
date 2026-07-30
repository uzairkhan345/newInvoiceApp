import { describe, expect, it } from "vitest";
import {
  isAlertCurrentlyFired,
  resolveScheduledDayThisMonth,
} from "@/lib/alertScheduleFiring";

/** Old enough to never fall in the same UTC month as any `now` used below, so it never triggers the created-after-scheduled-day suppression by accident. */
const LONG_AGO = new Date("2020-01-01T00:00:00Z");

describe("resolveScheduledDayThisMonth", () => {
  it("returns the day unchanged when the month has enough days", () => {
    expect(resolveScheduledDayThisMonth(15, new Date("2026-07-05T00:00:00Z"))).toBe(15);
  });

  it("clamps day 31 to Feb 28 in a non-leap year", () => {
    expect(resolveScheduledDayThisMonth(31, new Date("2027-02-01T00:00:00Z"))).toBe(28);
  });

  it("clamps day 31 to Feb 29 in a leap year", () => {
    expect(resolveScheduledDayThisMonth(31, new Date("2028-02-01T00:00:00Z"))).toBe(29);
  });

  it("clamps day 30 to Feb 28/29 too", () => {
    expect(resolveScheduledDayThisMonth(30, new Date("2027-02-01T00:00:00Z"))).toBe(28);
  });
});

describe("isAlertCurrentlyFired", () => {
  it("is false before the scheduled day arrives", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 15, recurring: true, clearedAt: null, createdAt: LONG_AGO },
        new Date("2026-07-10T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("is true on the scheduled day for a fresh recurring alert never cleared", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 15, recurring: true, clearedAt: null, createdAt: LONG_AGO },
        new Date("2026-07-15T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("stays true after the scheduled day for a fresh recurring alert never cleared", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 15, recurring: true, clearedAt: null, createdAt: LONG_AGO },
        new Date("2026-07-20T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("is false once cleared this month, for a recurring alert", () => {
    expect(
      isAlertCurrentlyFired(
        {
          dayOfMonth: 15,
          recurring: true,
          clearedAt: new Date("2026-07-16T00:00:00Z"),
          createdAt: LONG_AGO,
        },
        new Date("2026-07-20T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("re-arms automatically next month if cleared an earlier month, for a recurring alert", () => {
    expect(
      isAlertCurrentlyFired(
        {
          dayOfMonth: 15,
          recurring: true,
          clearedAt: new Date("2026-06-16T00:00:00Z"),
          createdAt: LONG_AGO,
        },
        new Date("2026-07-15T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("is true on the scheduled day for a one-time alert never cleared", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 15, recurring: false, clearedAt: null, createdAt: LONG_AGO },
        new Date("2026-07-15T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("is hidden forever once cleared, for a one-time alert — even many months later", () => {
    expect(
      isAlertCurrentlyFired(
        {
          dayOfMonth: 15,
          recurring: false,
          clearedAt: new Date("2026-07-16T00:00:00Z"),
          createdAt: LONG_AGO,
        },
        new Date("2027-03-15T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("is hidden the same month it was cleared, for a one-time alert", () => {
    expect(
      isAlertCurrentlyFired(
        {
          dayOfMonth: 15,
          recurring: false,
          clearedAt: new Date("2026-07-16T00:00:00Z"),
          createdAt: LONG_AGO,
        },
        new Date("2026-07-20T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("fires on the clamped day for a day-31 schedule in February", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 31, recurring: true, clearedAt: null, createdAt: LONG_AGO },
        new Date("2027-02-28T00:00:00Z"),
      ),
    ).toBe(true);
  });

  it("does not yet fire on Feb 27 for a day-31 schedule", () => {
    expect(
      isAlertCurrentlyFired(
        { dayOfMonth: 31, recurring: true, clearedAt: null, createdAt: LONG_AGO },
        new Date("2027-02-27T00:00:00Z"),
      ),
    ).toBe(false);
  });

  // M29 bug fix — creating a schedule for a day that's already passed this
  // month must not fire immediately; it should wait for the day's next
  // real occurrence instead.
  describe("newly-created schedule whose day already passed this month", () => {
    it("does not fire the same month it was created, for a recurring alert", () => {
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 7,
            recurring: true,
            clearedAt: null,
            createdAt: new Date("2026-07-30T00:00:00Z"),
          },
          new Date("2026-07-30T00:00:00Z"),
        ),
      ).toBe(false);
    });

    it("does not fire the same month it was created, for a one-time alert", () => {
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 7,
            recurring: false,
            clearedAt: null,
            createdAt: new Date("2026-07-30T00:00:00Z"),
          },
          new Date("2026-07-30T00:00:00Z"),
        ),
      ).toBe(false);
    });

    it("fires normally once the day arrives again next month", () => {
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 7,
            recurring: true,
            clearedAt: null,
            createdAt: new Date("2026-07-30T00:00:00Z"),
          },
          new Date("2026-08-07T00:00:00Z"),
        ),
      ).toBe(true);
    });

    it("fires immediately when created ON the scheduled day itself", () => {
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 30,
            recurring: true,
            clearedAt: null,
            createdAt: new Date("2026-07-30T00:00:00Z"),
          },
          new Date("2026-07-30T00:00:00Z"),
        ),
      ).toBe(true);
    });

    it("still fires this month if created before the scheduled day arrives", () => {
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 15,
            recurring: true,
            clearedAt: null,
            createdAt: new Date("2026-07-01T00:00:00Z"),
          },
          new Date("2026-07-15T00:00:00Z"),
        ),
      ).toBe(true);
    });

    it("does not suppress firing once created in an earlier month than `now`", () => {
      // Created last month after that month's occurrence had passed — by
      // the time we're in a new month, the suppression no longer applies.
      expect(
        isAlertCurrentlyFired(
          {
            dayOfMonth: 7,
            recurring: true,
            clearedAt: null,
            createdAt: new Date("2026-07-30T00:00:00Z"),
          },
          new Date("2026-09-10T00:00:00Z"),
        ),
      ).toBe(true);
    });
  });
});
