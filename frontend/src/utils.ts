import type { MonitorStatus } from "./types";

export function formatPercent(value: number | null) {
  return value === null ? "No data" : `${value.toFixed(2)}%`;
}

export function formatResponseTime(value: number | null) {
  return value === null ? "No data" : `${value} ms`;
}

export function formatDateTime(value: string | null) {
  if (!value) {
    return "No data";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function relativeTime(value: string | null) {
  if (!value) {
    return "No checks yet";
  }

  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  const units = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60]
  ] as const;

  for (const [unit, unitSeconds] of units) {
    if (seconds >= unitSeconds) {
      const count = Math.floor(seconds / unitSeconds);
      return `${count} ${unit}${count === 1 ? "" : "s"} ago`;
    }
  }

  return `${seconds} sec ago`;
}

export function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "Ongoing";
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;

  if (minutes === 0) {
    return `${remainder}s`;
  }

  const hours = Math.floor(minutes / 60);
  const minuteRemainder = minutes % 60;

  if (hours === 0) {
    return `${minutes}m ${remainder}s`;
  }

  return `${hours}h ${minuteRemainder}m`;
}

export function statusLabel(status: MonitorStatus) {
  const labels: Record<MonitorStatus, string> = {
    UP: "Up",
    DOWN: "Down",
    DEGRADED: "Degraded",
    PENDING: "Pending"
  };

  return labels[status];
}
