export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PENDING";

export type RecentCheck = {
  id?: string;
  success: boolean;
  responseTimeMs: number | null;
  checkedAt: Date;
};

export type OpenIncident = {
  id: string;
  startedAt: Date;
} | null;

export type IncidentDecision = {
  nextStatus: MonitorStatus;
  shouldOpenIncident: boolean;
  shouldResolveIncident: boolean;
  incidentStartedAt: Date | null;
};

const degradedThresholdMs = 2000;

export function evaluateIncidentState(
  recentChecksDesc: RecentCheck[],
  openIncident: OpenIncident
): IncidentDecision {
  const latest = recentChecksDesc[0];

  if (!latest) {
    return {
      nextStatus: "PENDING",
      shouldOpenIncident: false,
      shouldResolveIncident: false,
      incidentStartedAt: null
    };
  }

  if (openIncident) {
    if (latest.success) {
      return {
        nextStatus: isSlow(latest) ? "DEGRADED" : "UP",
        shouldOpenIncident: false,
        shouldResolveIncident: true,
        incidentStartedAt: null
      };
    }

    return {
      nextStatus: "DOWN",
      shouldOpenIncident: false,
      shouldResolveIncident: false,
      incidentStartedAt: null
    };
  }

  const failureStreak = collectLatestFailureStreak(recentChecksDesc);

  if (failureStreak.length >= 2) {
    return {
      nextStatus: "DOWN",
      shouldOpenIncident: true,
      shouldResolveIncident: false,
      incidentStartedAt: failureStreak[failureStreak.length - 1].checkedAt
    };
  }

  return {
    nextStatus: latest.success && isSlow(latest) ? "DEGRADED" : "UP",
    shouldOpenIncident: false,
    shouldResolveIncident: false,
    incidentStartedAt: null
  };
}

function collectLatestFailureStreak(recentChecksDesc: RecentCheck[]) {
  const streak: RecentCheck[] = [];

  for (const check of recentChecksDesc) {
    if (check.success) {
      break;
    }

    streak.push(check);
  }

  return streak;
}

function isSlow(check: RecentCheck) {
  return check.responseTimeMs !== null && check.responseTimeMs > degradedThresholdMs;
}
