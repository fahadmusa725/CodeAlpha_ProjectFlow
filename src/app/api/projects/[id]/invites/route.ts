import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { requireProjectAccess } from "@/lib/access";
import { Invite } from "@/models/Invite";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const now = new Date();
    const invites = await Invite.find(
      {
        project: id,
        acceptedAt: null,
        expiresAt: { $gt: now },
      },
      "_id email createdAt expiresAt"
    ).sort({ createdAt: -1 });

    const formattedInvites = invites.map((inv) => ({
      _id: inv._id.toString(),
      email: inv.email,
      createdAt: inv.createdAt.toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
    }));

    return NextResponse.json({ invites: formattedInvites }, { status: 200 });
  } catch (error) {
    console.error("GET /api/projects/[id]/invites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
