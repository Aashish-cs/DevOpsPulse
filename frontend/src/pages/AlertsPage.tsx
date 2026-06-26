import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Alert } from "../types";
import { formatDateTime } from "../utils";

export function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listAlerts()
      .then((response) => setAlerts(response.alerts))
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load alerts"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Alerts</h1>
          <p>{alerts.length} notifications</p>
        </div>
      </div>
      {loading ? <div className="centered-state">Loading alerts...</div> : null}
      {error ? <div className="notice error">{error}</div> : null}
      {!loading && alerts.length === 0 ? (
        <div className="empty-state">
          <Bell size={28} />
          <h2>No alerts yet</h2>
          <p>Incident and recovery events will appear here.</p>
        </div>
      ) : null}
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className={`alert-item alert-${alert.type.toLowerCase()}`} key={alert.id}>
            <div>
              <strong>{alert.monitor.name}</strong>
              <p>{alert.message}</p>
            </div>
            <time>{formatDateTime(alert.createdAt)}</time>
          </article>
        ))}
      </div>
    </section>
  );
}
