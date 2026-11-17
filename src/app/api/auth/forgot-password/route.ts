import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { after } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordReset } from "@/models/PasswordReset";
import { forgotPasswordSchema } from "@/lib/validators";
import {
  hit,
  getClientIp,
  hashKeyPart,
  tooManyRequests,
} from "@/lib/rate-limit";
import { isMailConfigured, sendMail, escapeHtml } from "@/lib/mail";

const SUCCESS_MESSAGE = "If this email is registered, a reset link has been sent.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const { email } = parsed.data;

  // Rate limiting
  // 1 hour window = 3,600,000 ms
  const clientIp = getClientIp(req);
  const emailHash = hashKeyPart(email);

  const ipKey = `forgot:ip:${clientIp}`;
  const emailKey = `forgot:email:${emailHash}`;

  const ipLimit = await hit(ipKey, 5, 60 * 60 * 1000);
  if (ipLimit.limited) {
    return tooManyRequests(ipLimit.retryAfterSeconds);
  }

  const emailLimit = await hit(emailKey, 3, 60 * 60 * 1000);
  if (emailLimit.limited) {
    return tooManyRequests(emailLimit.retryAfterSeconds);
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ email });

    // Always proceed to send 200 response
    // If user exists and mail is configured, process reset
    if (user && isMailConfigured() && !user.email.endsWith("@projectflow.demo")) {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Delete older reset records for this user
      await PasswordReset.deleteMany({ user: user._id });

      // Create new reset record
      await PasswordReset.create({
        user: user._id,
        tokenHash,
        expiresAt,
      });

      const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
      const escapedName = escapeHtml(user.name);

      const subject = "Reset your ProjectFlow password";
      const text = `Hello ${user.name},\n\nYou requested a password reset for your ProjectFlow account. Use the following link to set a new password:\n\n${resetUrl}\n\nThis link expires in 30 minutes. If you did not request this, you can safely ignore this email.\n\nProjectFlow Team`;
      const html = `<p>Hello ${escapedName},</p><p>You requested a password reset for your ProjectFlow account. Click the link below to set a new password:</p><p><a href="${resetUrl}">Reset Password</a></p><p>This link expires in 30 minutes. If you did not request this, you can safely ignore this email.</p><p>&mdash;<br>ProjectFlow Team</p>`;

      after(async () => {
        await sendMail({
          to: user.email,
          subject,
          text,
          html,
        });
      });
    }

    return NextResponse.json({ message: SUCCESS_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
