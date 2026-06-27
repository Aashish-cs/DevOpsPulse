# DevOpsPulse

DevOpsPulse is a full-stack uptime monitoring platform for tracking website availability, latency, incidents, recovery alerts, and public status pages.

The app is deployed as a real production-style portfolio project: React on Vercel, Express on Render, PostgreSQL on Neon, and a cron-job.org scheduler that triggers protected uptime checks every minute.

## Live Demo

- Frontend: [https://devopspulse.vercel.app](https://devopspulse.vercel.app)
- Backend health: [https://devopspulse-api.onrender.com/api/health](https://devopspulse-api.onrender.com/api/health)
- Repository: [https://github.com/Aashish-cs/DevOpsPulse](https://github.com/Aashish-cs/DevOpsPulse)

Demo account:

```text
Email: demo@devopspulse.local
Password: password123
```

Users can also sign up with their own email/password, create monitors, and view private dashboards scoped to their account.

## Screenshots

The live demo includes real monitor checks for Google, GitHub, Vercel, and Wikipedia.

### Dashboard

![DevOpsPulse dashboard](docs/screenshots/dashboard.png)

### Monitor Detail

![DevOpsPulse monitor detail](docs/screenshots/monitor-detail.png)

### Public Status Page

![DevOpsPulse public status page](docs/screenshots/public-status.png)

## Core Features

- JWT authentication stored in an httpOnly cookie
- User-scoped monitor CRUD
- URL checks with status code, latency, timeout, DNS, and connection-error handling
- Uptime percentage over `24h`, `7d`, `30d`, and `90d`
- Latency charts with Recharts
- Incident detection using a tested state machine
- In-app DOWN and RECOVERY alerts
- Public status pages with 90-day history
- External scheduler endpoint protected by `X-Cron-Secret`
- cron-job.org scheduler that triggers checks every minute

## Tech Stack

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript, React Router, Recharts, plain CSS |
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma |
| Database | PostgreSQL on Neon |
| Auth | JWT in httpOnly cookie |
| Scheduler | cron-job.org external cron |
| Deployment | Vercel frontend, Render backend |

## Architecture

```text
cron-job.org schedule
        |
        | POST /api/internal/run-checks
        v
Render Express API  ---- Prisma ---- Neon PostgreSQL
        ^
        |
Vercel React frontend
```

The checker is intentionally not an in-process cron. Render web services can restart, sleep, or scale, so uptime checks live behind a secured API endpoint and are triggered externally. This keeps scheduling infrastructure separate from business logic and makes overlapping runs safer.

PostgreSQL is used because this app is naturally relational: users own monitors, monitors have check results, incidents, alerts, and status pages. The schema also relies on indexed time-range queries for uptime and latency charts.

## Incident Detection

The most important logic lives in `backend/src/services/incident.ts` and is tested independently.

Rules:

- Every check creates a `CheckResult`.
- Non-2xx responses, timeouts, DNS failures, and refused connections are failed checks.
- Successful checks slower than `2000ms` are marked as degraded, but do not create incidents.
- Two latest consecutive failures open an incident if one is not already open.
- A successful check resolves an open incident and creates a recovery alert.
- Status precedence is `DOWN > DEGRADED > UP > PENDING`.
- Failure streaks are calculated from stored database rows, not in-memory counters.

## API Overview

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Monitors:

- `GET /api/monitors`
- `POST /api/monitors`
- `GET /api/monitors/:id`
- `PATCH /api/monitors/:id`
- `DELETE /api/monitors/:id`
- `GET /api/monitors/:id/checks?range=24h|7d|30d`
- `GET /api/monitors/:id/incidents`
- `GET /api/monitors/:id/uptime?range=24h|7d|30d`

Public:

- `GET /api/public/status/:slug`

Internal scheduler:

- `POST /api/internal/run-checks`
- Requires `X-Cron-Secret`

Alerts:

- `GET /api/alerts`

## Local Development

Install dependencies:

```bash
npm install
```

Create environment files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Configure `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/devopspulse?sslmode=require"
JWT_SECRET="replace-with-a-long-random-secret"
CRON_SECRET="replace-with-a-long-random-cron-secret"
FRONTEND_URL="http://localhost:5173"
PORT=4000
```

Configure `frontend/.env`:

```env
VITE_API_URL="http://localhost:4000/api"
```

Run migrations and seed data:

```bash
npm run prisma:migrate -w backend
npm run seed
```

Start both apps:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Trigger Checks Manually

```bash
curl -X POST http://localhost:4000/api/internal/run-checks \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

Example response:

```json
{
  "checked": 4,
  "skipped": 3,
  "failed": 0,
  "incidentsOpened": 0,
  "incidentsResolved": 0,
  "errors": []
}
```

## Scripts

```bash
npm run dev                 # Run frontend and backend together
npm run build               # Build both apps
npm run test                # Run backend unit tests
npm run prisma:generate     # Generate Prisma client
npm run seed                # Seed demo user and monitor history
```

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for Render, Vercel, Neon, and scheduler setup.

Current production setup:

- Vercel serves the React frontend.
- Render runs the Express API.
- Neon stores PostgreSQL data.
- cron-job.org calls the internal check endpoint every minute.

## Project Structure

```text
backend/
  prisma/
    schema.prisma
    seed.ts
  src/
    routes/
    services/
    middleware/
    utils/

frontend/
  src/
    api/
    auth/
    components/
    pages/
```

## Extension Points

- Email/SMS alerts can be added from the existing `Alert` model.
- Team/shared monitors can be layered on top of monitor ownership.
- Custom thresholds can be added to `Monitor` and passed into the incident evaluator.
- Status page branding can extend the `StatusPage` model.
