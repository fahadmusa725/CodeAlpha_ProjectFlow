import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireProjectAccess } from "@/lib/access";
import { Invite } from "@/models/Invite";

type Params = { params: Promise<{ id: string; inviteId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id, inviteId } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!mongoose.isValidObjectId(inviteId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await connectToDatabase();

    const deleted = await Invite.findOneAndDelete({
      _id: inviteId,
      project: id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/invites/[inviteId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
