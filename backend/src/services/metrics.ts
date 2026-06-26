import type { PrismaClient } from "@prisma/client";

type Db = PrismaClient;

export async function calculateUptime(db: Db, monitorId: string, since: Date) {
  const [totalChecks, successfulChecks] = await Promise.all([
    db.checkResult.count({
      where: {
        monitorId,
        checkedAt: { gte: since }
      }
    }),
    db.checkResult.count({
      where: {
        monitorId,
        success: true,
        checkedAt: { gte: since }
      }
    })
  ]);

  if (totalChecks === 0) {
    return null;
  }

  return Number(((successfulChecks / totalChecks) * 100).toFixed(2));
}

export async function calculateAverageResponseTime(db: Db, monitorId: string, since: Date) {
  const result = await db.checkResult.aggregate({
    where: {
      monitorId,
      checkedAt: { gte: since },
      responseTimeMs: { not: null }
    },
    _avg: {
      responseTimeMs: true
    }
  });

  return result._avg.responseTimeMs === null ? null : Math.round(result._avg.responseTimeMs);
}

export async function getLastCheckedAt(db: Db, monitorId: string) {
  const latest = await db.checkResult.findFirst({
    where: { monitorId },
    orderBy: [{ checkedAt: "desc" }, { id: "desc" }],
    select: { checkedAt: true }
  });

  return latest?.checkedAt ?? null;
}
