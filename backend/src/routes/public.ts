import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { calculateUptime } from "../services/metrics.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { daysAgo } from "../utils/timeRange.js";

const router = Router();

router.get(
  "/status/:slug",
  asyncHandler(async (req, res) => {
    const monitor = await prisma.monitor.findUnique({
      where: { slug: req.params.slug },
      include: { statusPage: true }
    });

    if (!monitor || !monitor.statusPage?.isPublic) {
      res.status(404).json({ error: "Status page not found" });
      return;
    }

    const since = daysAgo(90);
    const [uptime90d, checks, incidents] = await Promise.all([
      calculateUptime(prisma, monitor.id, since),
      prisma.checkResult.findMany({
        where: {
          monitorId: monitor.id,
          checkedAt: { gte: since }
        },
        select: { checkedAt: true }
      }),
      prisma.incident.findMany({
        where: {
          monitorId: monitor.id,
          startedAt: { lte: new Date() },
          OR: [{ resolvedAt: null }, { resolvedAt: { gte: since } }]
        },
        select: {
          startedAt: true,
          resolvedAt: true
        }
      })
    ]);

    res.json({
      monitor: {
        name: monitor.name,
        slug: monitor.slug,
        currentStatus: monitor.currentStatus
      },
      uptime90d,
      history: buildNinetyDayHistory(checks, incidents)
    });
  })
);

function buildNinetyDayHistory(
  checks: Array<{ checkedAt: Date }>,
  incidents: Array<{ startedAt: Date; resolvedAt: Date | null }>
) {
  const checkDays = new Set(checks.map((check) => dayKey(check.checkedAt)));
  const today = startOfDay(new Date());

  return Array.from({ length: 90 }, (_value, index) => {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - (89 - index));
    const date = dayKey(day);
    const hadIncident = incidents.some((incident) => overlapsDay(incident, day));

    return {
      date,
      status: hadIncident ? "down" : checkDays.has(date) ? "up" : "no_data"
    };
  });
}

function overlapsDay(incident: { startedAt: Date; resolvedAt: Date | null }, dayStart: Date) {
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayStart.getUTCDate() + 1);
  return incident.startedAt < dayEnd && (incident.resolvedAt === null || incident.resolvedAt >= dayStart);
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function dayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

export default router;
