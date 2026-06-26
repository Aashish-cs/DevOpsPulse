import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const alerts = await prisma.alert.findMany({
      where: {
        monitor: {
          userId: req.user!.id
        }
      },
      include: {
        monitor: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ alerts });
  })
);

export default router;
