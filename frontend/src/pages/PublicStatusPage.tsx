import { Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import type { PublicStatusResponse } from "../types";
import { formatPercent } from "../utils";

export function PublicStatusPage() {
  const { slug } = useParams<{ slug: string }>();
  const [status, setStatus] = useState<PublicStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      return;
    }

    api
      .getPublicStatus(slug)
      .then(setStatus)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Status page not found"))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="centered-state">Loading status...</div>;
  }

  if (error || !status) {
    return <div className="centered-state">{error ?? "Status page not found"}</div>;
  }

  return (
    <main className="public-status-page">
      <section className="public-status-header">
        <div className="brand public">
          <Activity size={24} />
          <span>DevOpsPulse</span>
        </div>
        <div>
          <h1>{status.monitor.name}</h1>
          <StatusBadge status={status.monitor.currentStatus} />
        </div>
        <div className="public-uptime">
          <span>90-day uptime</span>
          <strong>{formatPercent(status.uptime90d)}</strong>
        </div>
      </section>

      <section className="public-history" aria-label="90 day status history">
        {status.history.map((day) => (
          <span
            className={`history-day history-${day.status}`}
            key={day.date}
            title={`${day.date}: ${day.status.replace("_", " ")}`}
            aria-label={`${day.date}: ${day.status.replace("_", " ")}`}
          />
        ))}
      </section>
    </main>
  );
}
