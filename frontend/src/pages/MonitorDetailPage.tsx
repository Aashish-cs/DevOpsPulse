import { ArrowLeft, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api } from "../api/client";
import { StatusBadge } from "../components/StatusBadge";
import type { CheckResult, Incident, Monitor, TimeRange } from "../types";
import { formatDateTime, formatDuration, formatPercent, formatResponseTime } from "../utils";

const ranges: TimeRange[] = ["24h", "7d", "30d"];

export function MonitorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [range, setRange] = useState<TimeRange>("24h");
  const [uptimeByRange, setUptimeByRange] = useState<Record<TimeRange, number | null>>({
    "24h": null,
    "7d": null,
    "30d": null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([api.getMonitor(id), api.getChecks(id, range), ...ranges.map((item) => api.getUptime(id, item))])
      .then(([detail, checkResponse, ...uptimeResponses]) => {
        setMonitor(detail.monitor);
        setIncidents(detail.incidents);
        setChecks(checkResponse.checks);
        setUptimeByRange(
          uptimeResponses.reduce(
            (acc, item) => ({
              ...acc,
              [item.range]: item.uptime
            }),
            { "24h": null, "7d": null, "30d": null } as Record<TimeRange, number | null>
          )
        );
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load monitor"))
      .finally(() => setLoading(false));
  }, [id, range]);

  const chartData = useMemo(
    () =>
      checks.map((check) => ({
        checkedAt: formatDateTime(check.checkedAt),
        responseTimeMs: check.success ? check.responseTimeMs : null,
        status: check.success ? "Success" : check.errorMessage ?? "Failed"
      })),
    [checks]
  );

  if (loading) {
    return <div className="centered-state">Loading monitor...</div>;
  }

  if (error || !monitor) {
    return <div className="notice error">{error ?? "Monitor not found"}</div>;
  }

  return (
    <section className="page-stack">
      <div className="breadcrumb-row">
        <Link className="text-button" to="/dashboard">
          <ArrowLeft size={17} />
          <span>Dashboard</span>
        </Link>
        <Link className="text-button" to={`/status/${monitor.slug}`} target="_blank">
          <ExternalLink size={16} />
          <span>Public status</span>
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1>{monitor.name}</h1>
          <p>{monitor.url}</p>
        </div>
        <StatusBadge status={monitor.currentStatus} />
      </div>

      <div className="summary-strip">
        {ranges.map((item) => (
          <div key={item}>
            <span>{item} uptime</span>
            <strong>{formatPercent(uptimeByRange[item])}</strong>
          </div>
        ))}
        <div>
          <span>Interval</span>
          <strong>{monitor.checkIntervalMinutes} min</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Latency</h2>
            <p>Successful checks only</p>
          </div>
          <div className="segmented-control compact" role="tablist" aria-label="Chart range">
            {ranges.map((item) => (
              <button
                key={item}
                className={range === item ? "active" : ""}
                type="button"
                onClick={() => setRange(item)}
                role="tab"
                aria-selected={range === item}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-wrap">
          {chartData.length === 0 ? (
            <div className="centered-state">No checks in this range</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d9e2e7" />
                <XAxis dataKey="checkedAt" tick={{ fontSize: 12 }} minTickGap={40} />
                <YAxis tick={{ fontSize: 12 }} width={52} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="responseTimeMs"
                  name="Response time"
                  unit=" ms"
                  stroke="#227c70"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="panel-header">
            <h2>Recent checks</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Code</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {checks
                  .slice()
                  .reverse()
                  .slice(0, 25)
                  .map((check) => (
                    <tr key={check.id}>
                      <td>{formatDateTime(check.checkedAt)}</td>
                      <td>{check.success ? "Success" : check.errorMessage ?? "Failed"}</td>
                      <td>{check.statusCode ?? "-"}</td>
                      <td>{formatResponseTime(check.responseTimeMs)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Incidents</h2>
          </div>
          <div className="incident-list">
            {incidents.length === 0 ? <p className="muted">No incidents recorded.</p> : null}
            {incidents.map((incident) => (
              <article className="incident-item" key={incident.id}>
                <div>
                  <strong>{incident.resolvedAt ? "Resolved" : "Ongoing"}</strong>
                  <span>{formatDateTime(incident.startedAt)}</span>
                </div>
                <p>
                  {incident.resolvedAt ? `Resolved ${formatDateTime(incident.resolvedAt)}` : "Still open"} ·{" "}
                  {formatDuration(incident.downtimeDurationSeconds)}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
