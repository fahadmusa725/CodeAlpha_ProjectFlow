import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { User } from "@/models/User";
import { requireProjectAccess } from "@/lib/access";
import { addMemberSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const userToAdd = await User.findOne({ email: parsed.data.email });
    if (!userToAdd) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { project } = access;
    const alreadyMember = project.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    }

    project.members.push({ user: userToAdd._id, role: "member" });
    await project.save();

    const populated = await project.populate("members.user", "name email");

    return NextResponse.json({ project: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
