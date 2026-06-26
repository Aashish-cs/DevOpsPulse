import { PrismaClient, type MonitorStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const demoEmail = "demo@devopspulse.local";
const now = new Date();

async function main() {
  await prisma.user.deleteMany({ where: { email: demoEmail } });

  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      passwordHash: await bcrypt.hash("password123", 12)
    }
  });

  await createMonitorWithHistory({
    userId: user.id,
    name: "API Gateway",
    slug: "api-gateway",
    url: "https://example.com",
    currentStatus: "UP",
    profile: "mostly-up"
  });

  await createMonitorWithHistory({
    userId: user.id,
    name: "Docs Site",
    slug: "docs-site",
    url: "https://example.com/docs",
    currentStatus: "UP",
    profile: "resolved-incident"
  });

  await createMonitorWithHistory({
    userId: user.id,
    name: "Billing Worker Health",
    slug: "billing-worker-health",
    url: "https://example.com/health/billing",
    currentStatus: "DOWN",
    profile: "open-incident"
  });

  console.log("Seeded demo user:");
  console.log(`  email: ${demoEmail}`);
  console.log("  password: password123");
}

type HistoryProfile = "mostly-up" | "resolved-incident" | "open-incident";

async function createMonitorWithHistory(input: {
  userId: string;
  name: string;
  slug: string;
  url: string;
  currentStatus: MonitorStatus;
  profile: HistoryProfile;
}) {
  const monitor = await prisma.monitor.create({
    data: {
      userId: input.userId,
      name: input.name,
      slug: input.slug,
      url: input.url,
      checkIntervalMinutes: 5,
      currentStatus: input.currentStatus,
      statusPage: {
        create: { isPublic: true }
      }
    }
  });

  const checks = buildChecks(input.profile);

  await prisma.checkResult.createMany({
    data: checks.map((check) => ({
      monitorId: monitor.id,
      ...check
    }))
  });

  if (input.profile === "resolved-incident") {
    const startedAt = hoursAgo(30);
    const resolvedAt = hoursAgo(29);
    const incident = await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        startedAt,
        resolvedAt,
        downtimeDurationSeconds: secondsBetween(startedAt, resolvedAt)
      }
    });

    await prisma.alert.createMany({
      data: [
        {
          monitorId: monitor.id,
          incidentId: incident.id,
          type: "DOWN",
          message: `Alert created: ${input.name} is down`,
          createdAt: startedAt
        },
        {
          monitorId: monitor.id,
          incidentId: incident.id,
          type: "RECOVERY",
          message: `Recovery alert: ${input.name} is back up`,
          createdAt: resolvedAt
        }
      ]
    });
  }

  if (input.profile === "open-incident") {
    const startedAt = minutesAgo(15);
    const incident = await prisma.incident.create({
      data: {
        monitorId: monitor.id,
        startedAt
      }
    });

    await prisma.alert.create({
      data: {
        monitorId: monitor.id,
        incidentId: incident.id,
        type: "DOWN",
        message: `Alert created: ${input.name} is down`,
        createdAt: startedAt
      }
    });
  }
}

function buildChecks(profile: HistoryProfile) {
  const checks = [];

  for (let index = 96; index >= 1; index -= 1) {
    const checkedAt = new Date(now.getTime() - index * 30 * 60 * 1000);
    const baseline = 140 + ((index * 37) % 520);
    const slow = index % 17 === 0;
    let success = true;
    let statusCode = 200;
    let responseTimeMs = slow ? 2300 + (index % 5) * 80 : baseline;
    let errorMessage: string | null = null;

    if (profile === "resolved-incident" && (index === 60 || index === 59 || index === 58)) {
      success = false;
      statusCode = 503;
      responseTimeMs = 860;
      errorMessage = "HTTP 503";
    }

    if (profile === "open-incident" && (index === 3 || index === 2 || index === 1)) {
      success = false;
      statusCode = 0;
      responseTimeMs = null;
      errorMessage = "Request timed out after 5000ms";
    }

    checks.push({
      statusCode: success ? statusCode : statusCode === 0 ? null : statusCode,
      responseTimeMs,
      success,
      errorMessage,
      checkedAt
    });
  }

  return checks;
}

function hoursAgo(hours: number) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes: number) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

function secondsBetween(start: Date, end: Date) {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
