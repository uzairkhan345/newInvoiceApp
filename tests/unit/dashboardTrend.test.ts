import { describe, expect, it } from "vitest";
import {
  bucketCounts,
  daysAgo,
  daysSince,
  resolveTrendPresentation,
  scaleSparklineBars,
} from "@/lib/dashboardTrend";

describe("resolveTrendPresentation", () => {
  it("shows a flat dash and neutral tone for a zero delta regardless of semantics", () => {
    expect(resolveTrendPresentation(0, "higher-is-better")).toEqual({
      arrow: "–",
      deltaText: "0",
      tone: "neutral",
    });
    expect(resolveTrendPresentation(0, "lower-is-better")).toEqual({
      arrow: "–",
      deltaText: "0",
      tone: "neutral",
    });
  });

  it("neutral semantics always renders the flat dash even with a non-zero delta", () => {
    expect(resolveTrendPresentation(3, "neutral")).toEqual({
      arrow: "–",
      deltaText: "+3",
      tone: "neutral",
    });
    expect(resolveTrendPresentation(-2, "neutral")).toEqual({
      arrow: "–",
      deltaText: "-2",
      tone: "neutral",
    });
  });

  it("higher-is-better: up is favorable (green), down is unfavorable (red)", () => {
    expect(resolveTrendPresentation(2, "higher-is-better")).toEqual({
      arrow: "▲",
      deltaText: "+2",
      tone: "positive",
    });
    expect(resolveTrendPresentation(-3, "higher-is-better")).toEqual({
      arrow: "▼",
      deltaText: "-3",
      tone: "negative",
    });
  });

  it("lower-is-better: the favorability is inverted from higher-is-better", () => {
    expect(resolveTrendPresentation(2, "lower-is-better")).toEqual({
      arrow: "▲",
      deltaText: "+2",
      tone: "negative",
    });
    expect(resolveTrendPresentation(-3, "lower-is-better")).toEqual({
      arrow: "▼",
      deltaText: "-3",
      tone: "positive",
    });
  });
});

describe("bucketCounts", () => {
  it("splits the trailing window into equal buckets, oldest to newest", () => {
    const now = new Date("2026-07-28T00:00:00.000Z");
    const timestamps = [
      new Date("2026-07-27T00:00:00.000Z"), // 1 day ago -> last bucket
      new Date("2026-07-01T00:00:00.000Z"), // 27 days ago -> first bucket
      new Date("2026-07-26T00:00:00.000Z"), // 2 days ago -> last bucket
    ];
    const counts = bucketCounts(timestamps, 30, 5, now);
    expect(counts).toHaveLength(5);
    expect(counts[0]).toBe(1);
    expect(counts[4]).toBe(2);
    expect(counts[1] + counts[2] + counts[3]).toBe(0);
  });

  it("ignores timestamps older than the window", () => {
    const now = new Date("2026-07-28T00:00:00.000Z");
    const counts = bucketCounts(
      [new Date("2020-01-01T00:00:00.000Z")],
      30,
      5,
      now,
    );
    expect(counts.reduce((a, b) => a + b, 0)).toBe(0);
  });

  it("returns all-zero buckets for an empty input", () => {
    expect(bucketCounts([])).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("scaleSparklineBars", () => {
  it("scales counts to 0-100 relative to the max bucket", () => {
    expect(scaleSparklineBars([0, 1, 2, 4, 2])).toEqual([8, 25, 50, 100, 50]);
  });

  it("floors an all-zero series to a visible sliver rather than collapsing to nothing", () => {
    expect(scaleSparklineBars([0, 0, 0, 0, 0])).toEqual([8, 8, 8, 8, 8]);
  });
});

describe("daysAgo / daysSince", () => {
  it("daysAgo returns a Date exactly N days before `now`", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");
    expect(daysAgo(1, now).toISOString()).toBe("2026-07-27T12:00:00.000Z");
  });

  it("daysSince returns the whole number of days elapsed since a past date", () => {
    const now = new Date("2026-07-28T00:00:00.000Z");
    expect(daysSince(new Date("2026-07-16T00:00:00.000Z"), now)).toBe(12);
  });
});
