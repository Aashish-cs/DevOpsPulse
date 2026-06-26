export type MonitorStatus = "UP" | "DOWN" | "DEGRADED" | "PENDING";
export type AlertType = "DOWN" | "RECOVERY";
export type TimeRange = "24h" | "7d" | "30d";

export type User = {
  id: string;
  email: string;
};

export type MonitorSummary = {
  id: string;
  name: string;
  slug: string;
  currentStatus: MonitorStatus;
  checkIntervalMinutes: number;
  uptime24h: number | null;
  avgResponseTimeMs: number | null;
  lastCheckedAt: string | null;
  createdAt: string;
};

export type Monitor = {
  id: string;
  name: string;
  url: string;
  slug: string;
  checkIntervalMinutes: number;
  currentStatus: MonitorStatus;
  createdAt: string;
};

export type CheckResult = {
  id: string;
  monitorId: string;
  statusCode: number | null;
  responseTimeMs: number | null;
  success: boolean;
  errorMessage: string | null;
  checkedAt: string;
};

export type Incident = {
  id: string;
  monitorId: string;
  startedAt: string;
  resolvedAt: string | null;
  downtimeDurationSeconds: number | null;
};

export type Alert = {
  id: string;
  monitorId: string;
  incidentId: string | null;
  type: AlertType;
  message: string;
  createdAt: string;
  monitor: {
    id: string;
    name: string;
    slug: string;
  };
};

export type PublicStatusHistoryDay = {
  date: string;
  status: "up" | "down" | "no_data";
};

export type PublicStatusResponse = {
  monitor: {
    name: string;
    slug: string;
    currentStatus: MonitorStatus;
  };
  uptime90d: number | null;
  history: PublicStatusHistoryDay[];
};
