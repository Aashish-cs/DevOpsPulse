import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { authCookieName, authCookieOptions, requireAuth, signAuthToken } from "../middleware/auth.js";
import { prisma } from "../lib/prisma.js";
import { sendPasswordResetEmail } from "../services/email.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
const passwordResetTtlMs = 30 * 60 * 1000;
const resetResponseMessage = "If an account exists for that email, a password reset link has been sent.";

const credentialsSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase()),
  password: z.string().min(8)
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((email) => email.toLowerCase())
});

const resetPasswordSchema = z.object({
  token: z.string().min(32),
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
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    });

    if (!user) {
      res.json({ message: resetResponseMessage });
      return;
    }

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + passwordResetTtlMs);

    await prisma.$transaction([
      prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null
        },
        data: { usedAt: new Date() }
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt
        }
      })
    ]);

    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }

    res.json({
      message: resetResponseMessage,
      ...(env.NODE_ENV !== "production" || env.PASSWORD_RESET_EXPOSE_LINKS ? { resetUrl } : {})
    });
  })
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true
      }
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      res.status(400).json({ error: "Reset link is invalid or expired" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const usedAt = new Date();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt }
      }),
      prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
          id: { not: resetToken.id }
        },
        data: { usedAt }
      })
    ]);

    res.json({ message: "Password has been reset. You can now log in." });
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

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export default router;
