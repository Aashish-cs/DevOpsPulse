import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { AddMonitorModal } from "../components/AddMonitorModal";
import { StatusBadge } from "../components/StatusBadge";
import type { MonitorSummary } from "../types";
import { formatPercent, formatResponseTime, relativeTime } from "../utils";

export function DashboardPage() {
  const [monitors, setMonitors] = useState<MonitorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMonitors();
  }, []);

  async function loadMonitors() {
    setLoading(true);
    setError(null);

    try {
      const response = await api.listMonitors();
      setMonitors(response.monitors);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load monitors");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(input: { name: string; url: string; checkIntervalMinutes: number }) {
    setSubmitting(true);
    setFormError(null);

    try {
      await api.createMonitor(input);
      setModalOpen(false);
      await loadMonitors();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "Could not create monitor");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    await api.deleteMonitor(id);
    setMonitors((current) => current.filter((monitor) => monitor.id !== id));
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>{monitors.length} monitors tracked</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setModalOpen(true)}>
          <Plus size={18} />
          <span>Add monitor</span>
        </button>
      </div>

      {error ? <div className="notice error">{error}</div> : null}
      {loading ? <div className="centered-state">Loading monitors...</div> : null}

      {!loading && monitors.length === 0 ? (
        <div className="empty-state">
          <h2>No monitors yet</h2>
          <p>Add your first endpoint and trigger the cron endpoint to start collecting checks.</p>
        </div>
      ) : null}

      <div className="monitor-grid">
        {monitors.map((monitor) => (
          <article className="monitor-card" key={monitor.id}>
            <div className="monitor-card-header">
              <div>
                <h2>
                  <Link to={`/monitors/${monitor.id}`}>{monitor.name}</Link>
                </h2>
                <p>Every {monitor.checkIntervalMinutes} min</p>
              </div>
              <StatusBadge status={monitor.currentStatus} />
            </div>
            <dl className="metric-row">
              <div>
                <dt>24h uptime</dt>
                <dd>{formatPercent(monitor.uptime24h)}</dd>
              </div>
              <div>
                <dt>Avg latency</dt>
                <dd>{formatResponseTime(monitor.avgResponseTimeMs)}</dd>
              </div>
              <div>
                <dt>Last checked</dt>
                <dd>{relativeTime(monitor.lastCheckedAt)}</dd>
              </div>
            </dl>
            <div className="card-actions">
              <Link className="text-button" to={`/status/${monitor.slug}`} target="_blank">
                <ExternalLink size={16} />
                <span>Status</span>
              </Link>
              <button
                className="icon-button danger"
                type="button"
                onClick={() => void handleDelete(monitor.id)}
                aria-label={`Delete ${monitor.name}`}
                title={`Delete ${monitor.name}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
          </article>
        ))}
      </div>

      <AddMonitorModal
        open={modalOpen}
        submitting={submitting}
        error={formError}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </section>
  );
}
