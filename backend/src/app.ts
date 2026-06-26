import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import alertsRouter from "./routes/alerts.js";
import authRouter from "./routes/auth.js";
import internalRouter from "./routes/internal.js";
import monitorsRouter from "./routes/monitors.js";
import publicRouter from "./routes/public.js";
import { errorHandler, notFound } from "./middleware/error.js";

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRouter);
app.use("/api/monitors", monitorsRouter);
app.use("/api/internal", internalRouter);
app.use("/api/public", publicRouter);
app.use("/api/alerts", alertsRouter);

app.use(notFound);
app.use(errorHandler);
