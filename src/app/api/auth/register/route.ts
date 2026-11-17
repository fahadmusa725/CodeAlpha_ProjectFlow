import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { registerSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";
import { hit, getClientIp, tooManyRequests } from "@/lib/rate-limit";
import { findValidInviteByRawToken, acceptInvite } from "@/lib/invites";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.format() },
        { status: 400 }
      );
    }

    // Rate limiting: 1 hour window (3,600,000 ms), max 5 per IP
    const clientIp = getClientIp(req);
    const ipKey = `register:ip:${clientIp}`;
    const ipLimit = await hit(ipKey, 5, 60 * 60 * 1000);
    if (ipLimit.limited) {
      return tooManyRequests(ipLimit.retryAfterSeconds);
    }

    const { name, email, password, inviteToken } = parsed.data;

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });

    let joinedProject: string | undefined;

    if (inviteToken) {
      try {
        const invite = await findValidInviteByRawToken(inviteToken);
        if (invite && invite.email.toLowerCase() === email.toLowerCase()) {
          joinedProject = await acceptInvite(invite, user);
        }
      } catch (err) {
        console.error("Failed to accept invite during registration:", err);
      }
    }

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    const responseBody: { user: { id: string; name: string; email: string }; joinedProject?: string } = {
      user: { id: user._id.toString(), name: user.name, email: user.email },
    };

    if (joinedProject) {
      responseBody.joinedProject = joinedProject;
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: unknown }).code === 11000
    ) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }
    console.error("Register Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
