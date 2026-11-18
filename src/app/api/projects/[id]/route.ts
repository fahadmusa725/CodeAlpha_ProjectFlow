import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Notification } from "@/models/Notification";
import { requireProjectAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { updateProjectSchema } from "@/lib/validators";
import { publishToProject, publishToUser } from "@/lib/realtime";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  const { project } = access;
  const populated = await project.populate("members.user", "name email");

  return NextResponse.json({ project: populated });
}

export async function PATCH(req: Request, { params }: Params) {
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

  const parsed = updateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const update: Record<string, string> = {};
    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.description !== undefined) update.description = parsed.data.description;

    const project = await Project.findByIdAndUpdate(id, update, { new: true }).populate(
      "members.user",
      "name email"
    );

    if (project) {
      const payload = await getCurrentUser();
      await publishToProject(id, "project.updated", {
        actorId: payload?.userId || "",
        name: project.name,
        description: project.description,
      });

      const actorUserId = payload?.userId || "";
      for (const m of project.members) {
        const memberUserId = m.user?._id ? m.user._id.toString() : m.user?.toString();
        if (memberUserId && memberUserId !== actorUserId) {
          await publishToUser(memberUserId, "projects.changed", { projectId: id });
        }
      }
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error("PATCH /api/projects/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  if (access.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await connectToDatabase();

    const actorUserId = access.project.owner ? access.project.owner.toString() : "";
    const memberUserIds = access.project.members
      .map((m) => (m.user ? m.user.toString() : ""))
      .filter((uid) => uid && uid !== actorUserId);

    const tasks = await Task.find({ project: id }, "_id");
    const taskIds = tasks.map((t) => t._id);

    await Comment.deleteMany({ task: { $in: taskIds } });
    await Task.deleteMany({ project: id });
    await Notification.deleteMany({ project: id });
    const { Invite } = await import("@/models/Invite");
    await Invite.deleteMany({ project: id });
    await Project.findByIdAndDelete(id);

    const payload = await getCurrentUser();
    await publishToProject(id, "project.deleted", {
      actorId: payload?.userId || "",
    });

    for (const uid of memberUserIds) {
      await publishToUser(uid, "projects.changed", { projectId: id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/projects/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
