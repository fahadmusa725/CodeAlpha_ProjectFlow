import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { loginSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";
import {
  hit,
  reset,
  getClientIp,
  hashKeyPart,
  tooManyRequests,
} from "@/lib/rate-limit";

// Constant dummy hash to prevent timing attacks when email does not exist
const DUMMY_HASH = "$2b$10$xDzV2fiRHgDa1pqWZQdulOthCr3QNZfggdFGy9N9pbTvsa961B5ry";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Rate limiting: 15-minute window (900,000 ms)
  const clientIp = getClientIp(req);
  const emailHash = hashKeyPart(email);
  const ipKey = `login:ip:${clientIp}`;
  const pairKey = `login:pair:${clientIp}:${emailHash}`;

  const ipLimit = await hit(ipKey, 30, 15 * 60 * 1000);
  if (ipLimit.limited) {
    return tooManyRequests(ipLimit.retryAfterSeconds);
  }

  const pairLimit = await hit(pairKey, 5, 15 * 60 * 1000);
  if (pairLimit.limited) {
    return tooManyRequests(pairLimit.retryAfterSeconds);
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      // Run dummy compare to equalize response times against non-existent users
      await bcrypt.compare(password, DUMMY_HASH);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Reset failed count for this pair on successful login
    await reset(pairKey);

    const token = await signToken({ userId: user._id.toString(), email: user.email });
    await setAuthCookie(token);

    return NextResponse.json(
      { user: { id: user._id.toString(), name: user.name, email: user.email } },
      { status: 200 }
    );
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
