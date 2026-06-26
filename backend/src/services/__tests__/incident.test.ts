import { describe, expect, it } from "vitest";
import { evaluateIncidentState, type OpenIncident, type RecentCheck } from "../incident.js";

const t = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60 * 1000);

function check(success: boolean, minutesAgo: number, responseTimeMs: number | null = 120): RecentCheck {
  return {
    success,
    responseTimeMs,
    checkedAt: t(minutesAgo)
  };
}

describe("evaluateIncidentState", () => {
  it("keeps brand-new monitors pending before any check exists", () => {
    expect(evaluateIncidentState([], null)).toEqual({
      nextStatus: "PENDING",
      shouldOpenIncident: false,
      shouldResolveIncident: false,
      incidentStartedAt: null
    });
  });

  it("does not open an incident after a single failure", () => {
    const decision = evaluateIncidentState([check(false, 0)], null);

    expect(decision.nextStatus).toBe("UP");
    expect(decision.shouldOpenIncident).toBe(false);
  });

  it("opens an incident after two latest consecutive failures", () => {
    const latest = check(false, 0);
    const firstFailure = check(false, 5);
    const decision = evaluateIncidentState([latest, firstFailure, check(true, 10)], null);

    expect(decision.nextStatus).toBe("DOWN");
    expect(decision.shouldOpenIncident).toBe(true);
    expect(decision.incidentStartedAt).toBe(firstFailure.checkedAt);
  });

  it("uses the oldest available check in a failure streak as the incident start", () => {
    const oldestFailure = check(false, 10);
    const decision = evaluateIncidentState([check(false, 0), check(false, 5), oldestFailure], null);

    expect(decision.shouldOpenIncident).toBe(true);
    expect(decision.incidentStartedAt).toBe(oldestFailure.checkedAt);
  });

  it("does not count failures separated by a success as consecutive", () => {
    const decision = evaluateIncidentState([check(false, 0), check(true, 5), check(false, 10)], null);

    expect(decision.nextStatus).toBe("UP");
    expect(decision.shouldOpenIncident).toBe(false);
  });

  it("resolves an open incident when the latest check succeeds", () => {
    const openIncident: OpenIncident = { id: "incident_1", startedAt: t(20) };
    const decision = evaluateIncidentState([check(true, 0)], openIncident);

    expect(decision.nextStatus).toBe("UP");
    expect(decision.shouldResolveIncident).toBe(true);
  });

  it("marks a recovered monitor degraded when the recovery check is slow", () => {
    const openIncident: OpenIncident = { id: "incident_1", startedAt: t(20) };
    const decision = evaluateIncidentState([check(true, 0, 2400)], openIncident);

    expect(decision.nextStatus).toBe("DEGRADED");
    expect(decision.shouldResolveIncident).toBe(true);
  });

  it("keeps an open incident down while failures continue", () => {
    const openIncident: OpenIncident = { id: "incident_1", startedAt: t(20) };
    const decision = evaluateIncidentState([check(false, 0), check(false, 5)], openIncident);

    expect(decision.nextStatus).toBe("DOWN");
    expect(decision.shouldResolveIncident).toBe(false);
  });

  it("marks a monitor degraded for a slow successful check without opening an incident", () => {
    const decision = evaluateIncidentState([check(true, 0, 2201)], null);

    expect(decision.nextStatus).toBe("DEGRADED");
    expect(decision.shouldOpenIncident).toBe(false);
  });
});
