# DevOpsPulse Deployment

## Database

Create a free PostgreSQL database on Neon or Supabase. Copy the pooled or direct connection string into the backend environment as `DATABASE_URL`.

Run migrations from your machine or a CI step:

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
```

Seed only if you want demo data in that environment:

```bash
npm run seed
```

## Backend on Render

Create a Render Web Service, not a cron service.

- Root directory: repository root
- Build command: `npm install --include=dev && npm run prisma:generate && npm run build -w backend`
- Start command: `npm run start -w backend`
- Environment variables:
  - `DATABASE_URL`: Neon/Supabase PostgreSQL connection string
  - `JWT_SECRET`: long random string, at least 32 characters
  - `CRON_SECRET`: long random string used by the external cron trigger
  - `FRONTEND_URL`: your Vercel frontend URL, for example `https://devopspulse.vercel.app`
  - `NODE_ENV`: `production`

You can also use the included `render.yaml` as a starter Blueprint for the backend web service. Set the secret environment variables in Render after creating the service.

After the first deploy, run Prisma migrations against the same database.

## Render Cron Job

Create a separate Render Cron Job that calls the backend web service every 5 minutes.

- Schedule: `*/5 * * * *`
- Command:

```bash
curl -X POST https://YOUR-BACKEND.onrender.com/api/internal/run-checks \
  -H "X-Cron-Secret: YOUR_CRON_SECRET"
```

The endpoint is intentionally protected by `X-Cron-Secret` instead of user auth because it is called by infrastructure.

## Frontend on Vercel

Create a Vercel project from the same repository.

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables:
  - `VITE_API_URL`: `https://YOUR-BACKEND.onrender.com/api`

The included `frontend/vercel.json` handles React Router fallback routes.

The backend sets the JWT in an httpOnly cookie. In production the cookie is configured with `SameSite=None` and `Secure`, so HTTPS is required.

## CORS and Cookies

Set `FRONTEND_URL` on Render to the exact deployed frontend origin. Set `VITE_API_URL` on Vercel to the exact backend API origin plus `/api`.

Example:

- `FRONTEND_URL=https://devopspulse.vercel.app`
- `VITE_API_URL=https://devopspulse-api.onrender.com/api`
