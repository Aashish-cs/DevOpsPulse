# DevOpsPulse

DevOpsPulse is a full-stack uptime monitoring platform built as a portfolio project. It includes a TypeScript React frontend, a TypeScript Express API, Prisma models for PostgreSQL, JWT auth through an httpOnly cookie, public status pages, in-app alerts, and an externally triggered checker endpoint.

## Architecture

- `frontend/`: React + Vite + TypeScript, React Router, Recharts, plain CSS.
- `backend/`: Node.js + Express + TypeScript, Prisma, JWT cookie auth.
- `backend/prisma/schema.prisma`: PostgreSQL schema with users, monitors, check results, incidents, status pages, and alerts.
- `backend/src/services/incident.ts`: pure incident state machine with unit tests.
- `backend/src/services/checker.ts`: URL pinging and cron-triggered check orchestration.

DevOpsPulse intentionally uses an external cron trigger instead of in-process scheduling. Render can restart or scale web services at any time, and in-process timers can drift, duplicate work, or disappear during deploys. Keeping checking behind `POST /api/internal/run-checks` lets infrastructure own the schedule while the API owns the business logic.

PostgreSQL is used because the app relies on relational ownership checks, cascading deletes, time-range queries, indexed histories, and incident/check joins. It also maps cleanly to Neon or Supabase free-tier databases through a standard `DATABASE_URL`.

## Incident Detection

Every check stores a `CheckResult` row. A check is successful only when the request completes and returns a 2xx status. Slow successful responses above 2000 ms are still successful, but they set the monitor to `DEGRADED` when no incident is open.

The state machine queries the latest stored check rows instead of keeping an in-memory counter:

- No checks: `PENDING`
- One failed check without an open incident: `UP`
- Two or more latest consecutive failures and no open incident: open an incident, set `DOWN`, create a `DOWN` alert
- Open incident plus latest success: resolve incident, calculate downtime, create a `RECOVERY` alert
- No open incident plus latest slow success: `DEGRADED`
- `DOWN` always takes precedence over `DEGRADED`, `UP`, and `PENDING`

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment files:

   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. Update `backend/.env` with a PostgreSQL `DATABASE_URL`, `JWT_SECRET`, `CRON_SECRET`, and `FRONTEND_URL`.

4. Generate Prisma and run migrations:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate -w backend
   ```

5. Seed demo data:

   ```bash
   npm run seed
   ```

   Demo credentials:

   - Email: `demo@devopspulse.local`
   - Password: `password123`

6. Start both apps:

   ```bash
   npm run dev
   ```

The frontend runs on `http://localhost:5173`, and the backend runs on `http://localhost:4000`.

## Triggering Checks Locally

```bash
curl -X POST http://localhost:4000/api/internal/run-checks \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

The response includes a summary such as:

```json
{
  "checked": 12,
  "skipped": 0,
  "failed": 0,
  "incidentsOpened": 1,
  "incidentsResolved": 0,
  "errors": []
}
```

## Scripts

- `npm run dev`: run frontend and backend together.
- `npm run build`: type-check and build both apps.
- `npm run test`: run backend unit tests.
- `npm run prisma:generate`: generate Prisma client.
- `npm run seed`: seed demo data.

## V1 Extension Points

- Real email/SMS delivery can be added from the `Alert` model without changing incident detection.
- Teams/shared monitors can be added by replacing direct `Monitor.userId` ownership with memberships.
- Custom thresholds can be added to `Monitor` and passed into the pure evaluator.
- Status page customization can extend the `StatusPage` model.
