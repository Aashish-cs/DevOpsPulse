import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { calculateAverageResponseTime, calculateUptime, getLastCheckedAt } from "../services/metrics.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateUniqueSlug } from "../utils/slug.js";
import { getRangeStart, parseRange } from "../utils/timeRange.js";

const router = Router();

const monitorCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  url: z.string().url(),
  checkIntervalMinutes: z.coerce.number().int().min(1).max(1440)
});

const monitorUpdateSchema = monitorCreateSchema.partial();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const since24h = getRangeStart("24h");
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" }
    });

    const summaries = await Promise.all(
      monitors.map(async (monitor) => {
        const [uptime24h, avgResponseTimeMs, lastCheckedAt] = await Promise.all([
          calculateUptime(prisma, monitor.id, since24h),
          calculateAverageResponseTime(prisma, monitor.id, since24h),
          getLastCheckedAt(prisma, monitor.id)
        ]);

        return {
          id: monitor.id,
          name: monitor.name,
          slug: monitor.slug,
          currentStatus: monitor.currentStatus,
          checkIntervalMinutes: monitor.checkIntervalMinutes,
          uptime24h,
          avgResponseTimeMs,
          lastCheckedAt,
          createdAt: monitor.createdAt
        };
      })
    );

    res.json({ monitors: summaries });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = monitorCreateSchema.parse(req.body);
    const slug = await generateUniqueSlug(data.name);

    const monitor = await prisma.monitor.create({
      data: {
        ...data,
        slug,
        userId: req.user!.id,
        statusPage: {
          create: {
            isPublic: true
          }
        }
      }
    });

    res.status(201).json({ monitor });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    const [recentChecks, incidents, uptime24h, uptime7d, uptime30d, avgResponseTimeMs] = await Promise.all([
      prisma.checkResult.findMany({
        where: { monitorId: monitor.id },
        orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
        take: 25
      }),
      prisma.incident.findMany({
        where: { monitorId: monitor.id },
        orderBy: { startedAt: "desc" },
        take: 20
      }),
      calculateUptime(prisma, monitor.id, getRangeStart("24h")),
      calculateUptime(prisma, monitor.id, getRangeStart("7d")),
      calculateUptime(prisma, monitor.id, getRangeStart("30d")),
      calculateAverageResponseTime(prisma, monitor.id, getRangeStart("24h"))
    ]);

    res.json({
      monitor,
      recentChecks,
      incidents,
      metrics: {
        uptime24h,
        uptime7d,
        uptime30d,
        avgResponseTimeMs
      }
    });
  })
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    const data = monitorUpdateSchema.parse(req.body);
    const updated = await prisma.monitor.update({
      where: { id: monitor.id },
      data
    });

    res.json({ monitor: updated });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    await prisma.monitor.delete({ where: { id: monitor.id } });
    res.status(204).send();
  })
);

router.get(
  "/:id/checks",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    const range = parseRange(req.query.range);
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10));
    const limit = Math.min(500, Math.max(1, Number.parseInt(String(req.query.limit ?? "200"), 10)));
    const since = getRangeStart(range);
    const where = {
      monitorId: monitor.id,
      checkedAt: { gte: since }
    };
    const [checksDesc, total] = await Promise.all([
      prisma.checkResult.findMany({
        where,
        orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.checkResult.count({ where })
    ]);

    res.json({
      range,
      page,
      limit,
      total,
      checks: checksDesc.reverse()
    });
  })
);

router.get(
  "/:id/incidents",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    const incidents = await prisma.incident.findMany({
      where: { monitorId: monitor.id },
      orderBy: { startedAt: "desc" }
    });

    res.json({ incidents });
  })
);

router.get(
  "/:id/uptime",
  asyncHandler(async (req, res) => {
    const monitor = await findOwnedMonitor(req.params.id, req.user!.id);

    if (!monitor) {
      res.status(404).json({ error: "Monitor not found" });
      return;
    }

    const range = parseRange(req.query.range);
    const uptime = await calculateUptime(prisma, monitor.id, getRangeStart(range));

    res.json({ range, uptime });
  })
);

async function findOwnedMonitor(id: string, userId: string) {
  return prisma.monitor.findFirst({
    where: {
      id,
      userId
    }
  });
}

export default router;
