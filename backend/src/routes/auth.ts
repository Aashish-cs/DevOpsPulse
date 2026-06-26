import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { authCookieName, authCookieOptions, requireAuth, signAuthToken } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const credentialsSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8)
});

router.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const credentials = credentialsSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(credentials.password, 12);

    const user = await prisma.user.create({
      data: {
        email: credentials.email,
        passwordHash
      },
      select: {
        id: true,
        email: true
      }
    });

    res.cookie(authCookieName, signAuthToken(user), authCookieOptions);
    res.status(201).json({ user });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const credentials = credentialsSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: credentials.email }
    });

    if (!user || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const safeUser = { id: user.id, email: user.email };
    res.cookie(authCookieName, signAuthToken(safeUser), authCookieOptions);
    res.json({ user: safeUser });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie(authCookieName, authCookieOptions);
  res.status(204).send();
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
