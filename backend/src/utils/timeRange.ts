export type TimeRange = "24h" | "7d" | "30d";

const rangeDurationsMs: Record<TimeRange, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000
};

export function parseRange(value: unknown): TimeRange {
  if (value === "7d" || value === "30d" || value === "24h") {
    return value;
  }

  return "24h";
}

export function getRangeStart(range: TimeRange) {
  return new Date(Date.now() - rangeDurationsMs[range]);
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
