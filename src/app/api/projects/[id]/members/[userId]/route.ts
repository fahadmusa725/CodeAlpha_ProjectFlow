import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { requireProjectAccess } from "@/lib/access";

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id, userId } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!mongoose.isValidObjectId(userId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { project } = access;

  const targetMember = project.members.find((m) => m.user.toString() === userId);
  if (!targetMember) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (targetMember.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the owner" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    project.members = project.members.filter((m) => m.user.toString() !== userId) as typeof project.members;
    await project.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]/members/[userId]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
