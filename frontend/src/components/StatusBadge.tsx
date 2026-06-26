import type { MonitorStatus } from "../types";
import { statusLabel } from "../utils";

export function StatusBadge({ status }: { status: MonitorStatus }) {
  return <span className={`status-badge status-${status.toLowerCase()}`}>{statusLabel(status)}</span>;
}
