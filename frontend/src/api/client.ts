import type {
  Alert,
  CheckResult,
  Incident,
  Monitor,
  MonitorSummary,
  PublicStatusResponse,
  TimeRange,
  User
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

async function request<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error ?? "Request failed");
  }

  return payload as T;
}

export const api = {
  signup: (body: { email: string; password: string }) =>
    request<{ user: User }>("/auth/signup", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<{ user: User }>("/auth/login", { method: "POST", body }),
  forgotPassword: (body: { email: string }) =>
    request<{ message: string; resetUrl?: string }>("/auth/forgot-password", { method: "POST", body }),
  resetPassword: (body: { token: string; password: string }) =>
    request<{ message: string }>("/auth/reset-password", { method: "POST", body }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/auth/me"),

  listMonitors: () => request<{ monitors: MonitorSummary[] }>("/monitors"),
  createMonitor: (body: { name: string; url: string; checkIntervalMinutes: number }) =>
    request<{ monitor: Monitor }>("/monitors", { method: "POST", body }),
  updateMonitor: (id: string, body: { name: string; url: string; checkIntervalMinutes: number }) =>
    request<{ monitor: Monitor }>(`/monitors/${id}`, { method: "PATCH", body }),
  deleteMonitor: (id: string) => request<void>(`/monitors/${id}`, { method: "DELETE" }),
  getMonitor: (id: string) =>
    request<{
      monitor: Monitor;
      recentChecks: CheckResult[];
      incidents: Incident[];
      metrics: {
        uptime24h: number | null;
        uptime7d: number | null;
        uptime30d: number | null;
        avgResponseTimeMs: number | null;
      };
    }>(`/monitors/${id}`),
  getChecks: (id: string, range: TimeRange) =>
    request<{ range: TimeRange; page: number; limit: number; total: number; checks: CheckResult[] }>(
      `/monitors/${id}/checks?range=${range}&limit=500`
    ),
  getUptime: (id: string, range: TimeRange) =>
    request<{ range: TimeRange; uptime: number | null }>(`/monitors/${id}/uptime?range=${range}`),
  listAlerts: () => request<{ alerts: Alert[] }>("/alerts"),
  getPublicStatus: (slug: string) => request<PublicStatusResponse>(`/public/status/${slug}`)
};
