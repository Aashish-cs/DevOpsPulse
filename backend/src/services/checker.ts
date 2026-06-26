import type { Monitor, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { evaluateIncidentState } from "./incident.js";

const checkTimeoutMs = 5000;

type MonitorWithLastCheck = Monitor & {
  checkResults: Array<{ checkedAt: Date }>;
};

type CheckSummaryItem =
  | { status: "checked"; incidentsOpened: number; incidentsResolved: number }
  | { status: "skipped" }
  | { status: "failed"; error: string };

export async function runDueChecks(db: PrismaClient = prisma) {
  const monitors = await db.monitor.findMany({
    include: {
      checkResults: {
        orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
        take: 1,
        select: { checkedAt: true }
      }
    }
  });

  const dueMonitors = monitors.filter(isMonitorDue);
  const settled = await Promise.allSettled(dueMonitors.map((monitor) => checkMonitorWithGuard(db, monitor)));

  return settled.reduce(
    (summary, result) => {
      if (result.status === "rejected") {
        summary.failed += 1;
        summary.errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        return summary;
      }

      if (result.value.status === "skipped") {
        summary.skipped += 1;
        return summary;
      }

      if (result.value.status === "failed") {
        summary.failed += 1;
        summary.errors.push(result.value.error);
        return summary;
      }

      summary.checked += 1;
      summary.incidentsOpened += result.value.incidentsOpened;
      summary.incidentsResolved += result.value.incidentsResolved;
      return summary;
    },
    {
      checked: 0,
      skipped: monitors.length - dueMonitors.length,
      failed: 0,
      incidentsOpened: 0,
      incidentsResolved: 0,
      errors: [] as string[]
    }
  );
}

function isMonitorDue(monitor: MonitorWithLastCheck) {
  const latestCheck = monitor.checkResults[0];

  if (!latestCheck) {
    return true;
  }

  const elapsedMs = Date.now() - latestCheck.checkedAt.getTime();
  return elapsedMs >= monitor.checkIntervalMinutes * 60 * 1000;
}

async function checkMonitorWithGuard(db: PrismaClient, monitor: MonitorWithLastCheck): Promise<CheckSummaryItem> {
  try {
    return await db.$transaction(
      async (tx) => {
        const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
          SELECT pg_try_advisory_xact_lock(hashtext(${monitor.id})) AS locked
        `;

        if (!lockRows[0]?.locked) {
          return { status: "skipped" };
        }

        const latestCheck = await tx.checkResult.findFirst({
          where: { monitorId: monitor.id },
          orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
          select: { checkedAt: true }
        });

        if (latestCheck) {
          const elapsedMs = Date.now() - latestCheck.checkedAt.getTime();
          if (elapsedMs < monitor.checkIntervalMinutes * 60 * 1000) {
            return { status: "skipped" };
          }
        }

        const checkResult = await pingUrl(monitor.url);
        await tx.checkResult.create({
          data: {
            monitorId: monitor.id,
            statusCode: checkResult.statusCode,
            responseTimeMs: checkResult.responseTimeMs,
            success: checkResult.success,
            errorMessage: checkResult.errorMessage,
            checkedAt: checkResult.checkedAt
          }
        });

        const recentChecks = await tx.checkResult.findMany({
          where: { monitorId: monitor.id },
          orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
          take: 3,
          select: {
            id: true,
            success: true,
            responseTimeMs: true,
            checkedAt: true
          }
        });

        const openIncident = await tx.incident.findFirst({
          where: {
            monitorId: monitor.id,
            resolvedAt: null
          },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            startedAt: true
          }
        });

        const decision = evaluateIncidentState(recentChecks, openIncident);
        let incidentsOpened = 0;
        let incidentsResolved = 0;

        if (decision.shouldOpenIncident && decision.incidentStartedAt) {
          const incident = await tx.incident.create({
            data: {
              monitorId: monitor.id,
              startedAt: decision.incidentStartedAt
            }
          });

          await tx.alert.create({
            data: {
              monitorId: monitor.id,
              incidentId: incident.id,
              type: "DOWN",
              message: `Alert created: ${monitor.name} is down`
            }
          });

          incidentsOpened += 1;
        }

        if (decision.shouldResolveIncident && openIncident) {
          const resolvedAt = new Date();
          const downtimeDurationSeconds = Math.max(
            0,
            Math.floor((resolvedAt.getTime() - openIncident.startedAt.getTime()) / 1000)
          );

          await tx.incident.update({
            where: { id: openIncident.id },
            data: {
              resolvedAt,
              downtimeDurationSeconds
            }
          });

          await tx.alert.create({
            data: {
              monitorId: monitor.id,
              incidentId: openIncident.id,
              type: "RECOVERY",
              message: `Recovery alert: ${monitor.name} is back up`
            }
          });

          incidentsResolved += 1;
        }

        await tx.monitor.update({
          where: { id: monitor.id },
          data: { currentStatus: decision.nextStatus }
        });

        return { status: "checked", incidentsOpened, incidentsResolved };
      },
      { timeout: 15000, maxWait: 5000 }
    );
  } catch (error) {
    return {
      status: "failed",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function pingUrl(url: string) {
  const controller = new AbortController();
  const checkedAt = new Date();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), checkTimeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow"
    });
    const responseTimeMs = Date.now() - startedAt;
    const success = response.status >= 200 && response.status < 300;

    return {
      statusCode: response.status,
      responseTimeMs,
      success,
      errorMessage: success ? null : `HTTP ${response.status}`,
      checkedAt
    };
  } catch (error) {
    return {
      statusCode: null,
      responseTimeMs: null,
      success: false,
      errorMessage: classifyFetchError(error),
      checkedAt
    };
  } finally {
    clearTimeout(timeout);
  }
}

function classifyFetchError(error: unknown) {
  const err = error as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
  const code = err.code ?? err.cause?.code;
  const message = error instanceof Error ? error.message : String(error);

  if (err.name === "AbortError") {
    return `Request timed out after ${checkTimeoutMs}ms`;
  }

  if (code === "ENOTFOUND" || code === "EAI_AGAIN" || message.includes("getaddrinfo")) {
    return "DNS resolution failed";
  }

  if (code === "ECONNREFUSED") {
    return "Connection refused";
  }

  if (code === "ETIMEDOUT") {
    return `Request timed out after ${checkTimeoutMs}ms`;
  }

  return `Request failed: ${message}`;
}
