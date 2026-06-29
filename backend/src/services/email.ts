import { env } from "../config/env.js";

type PasswordResetDelivery = {
  delivered: boolean;
};

export async function sendPasswordResetEmail(email: string, resetUrl: string): Promise<PasswordResetDelivery> {
  if (!env.RESEND_API_KEY) {
    console.info(`Password reset link for ${email}: ${resetUrl}`);
    return { delivered: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.PASSWORD_RESET_FROM_EMAIL,
      to: email,
      subject: "Reset your DevOpsPulse password",
      text: `Reset your DevOpsPulse password: ${resetUrl}\n\nThis link expires in 30 minutes.`,
      html: `
        <p>Use the link below to reset your DevOpsPulse password.</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires in 30 minutes.</p>
      `
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Password reset email failed: ${response.status} ${detail}`);
  }

  return { delivered: true };
}
