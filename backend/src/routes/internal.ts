import { Router } from "express";
import { env } from "../config/env.js";
import { runDueChecks } from "../services/checker.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
  "/run-checks",
  asyncHandler(async (req, res) => {
    if (req.get("X-Cron-Secret") !== env.CRON_SECRET) {
      res.status(401).json({ error: "Invalid cron secret" });
      return;
    }

    const summary = await runDueChecks();
    res.json(summary);
  })
);

export default router;
