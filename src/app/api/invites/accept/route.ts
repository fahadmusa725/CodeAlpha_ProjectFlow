import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/models/User";
import { findValidInviteByRawToken, acceptInvite } from "@/lib/invites";

const INVALID_INVITE_ERROR = "This invitation is invalid or has expired.";

export async function POST(req: Request) {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: INVALID_INVITE_ERROR }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("token" in body) ||
    typeof (body as { token: unknown }).token !== "string"
  ) {
    return NextResponse.json({ error: INVALID_INVITE_ERROR }, { status: 400 });
  }

  const token = (body as { token: string }).token.trim();

  try {
    await connectToDatabase();

    const user = await User.findById(payload.userId);
    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invite = await findValidInviteByRawToken(token);
    if (!invite) {
      return NextResponse.json({ error: INVALID_INVITE_ERROR }, { status: 400 });
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ error: INVALID_INVITE_ERROR }, { status: 400 });
    }

    const projectId = await acceptInvite(invite, user);

    return NextResponse.json({ projectId }, { status: 200 });
  } catch (error) {
    console.error("POST /api/invites/accept:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
