import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { PasswordReset } from "@/models/PasswordReset";
import { resetPasswordSchema } from "@/lib/validators";
import { hit, getClientIp, tooManyRequests } from "@/lib/rate-limit";

const INVALID_RESET_ERROR = "This reset link is invalid or has expired.";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: INVALID_RESET_ERROR }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: INVALID_RESET_ERROR }, { status: 400 });
  }

  const { token, password } = parsed.data;

  // Rate limit: "reset:ip:<ip>" max 10 per hour
  const clientIp = getClientIp(req);
  const ipKey = `reset:ip:${clientIp}`;
  const ipLimit = await hit(ipKey, 10, 60 * 60 * 1000);
  if (ipLimit.limited) {
    return tooManyRequests(ipLimit.retryAfterSeconds);
  }

  try {
    await connectToDatabase();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const resetDoc = await PasswordReset.findOneAndUpdate(
      {
        tokenHash,
        usedAt: null,
        expiresAt: { $gt: now },
      },
      { usedAt: now }
    );

    if (!resetDoc) {
      return NextResponse.json({ error: INVALID_RESET_ERROR }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(resetDoc.user, { passwordHash });

    // Delete all reset records of that user
    await PasswordReset.deleteMany({ user: resetDoc.user });

    return NextResponse.json(
      { message: "Password updated successfully. You can now sign in with your new password." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
