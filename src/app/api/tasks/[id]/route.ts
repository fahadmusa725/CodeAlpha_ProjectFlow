import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Project } from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import { updateTaskSchema } from "@/lib/validators";

type Params = { params: Promise<{ id: string }> };

async function loadTaskAndVerifyMember(taskId: string) {
  if (!mongoose.isValidObjectId(taskId)) return null;

  const payload = await getCurrentUser();
  if (!payload) return "unauthorized" as const;

  await connectToDatabase();

  const task = await Task.findById(taskId);
  if (!task) return null;

  const project = await Project.findById(task.project);
  if (!project) return null;

  const member = project.members.find((m) => m.user.toString() === payload.userId);
  if (!member) return null;

  return { task, project, member, userId: payload.userId };
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const ctx = await loadTaskAndVerifyMember(id);

  if (ctx === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const { assignee, dueDate, ...rest } = parsed.data;

  if (assignee !== undefined && assignee !== null) {
    if (!mongoose.isValidObjectId(assignee)) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
    const isMember = ctx.project.members.some((m) => m.user.toString() === assignee);
    if (!isMember) {
      return NextResponse.json({ error: "Assignee is not a project member" }, { status: 400 });
    }
  }

  try {
    const $set: Record<string, unknown> = { ...rest };
    const $unset: Record<string, 1> = {};

    if (assignee === null) {
      $unset.assignee = 1;
    } else if (assignee !== undefined) {
      $set.assignee = new mongoose.Types.ObjectId(assignee);
    }

    if (dueDate === null) {
      $unset.dueDate = 1;
    } else if (dueDate !== undefined) {
      $set.dueDate = new Date(dueDate);
    }

    const mongoUpdate: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0) mongoUpdate.$unset = $unset;

    const task = await Task.findByIdAndUpdate(id, mongoUpdate, { new: true })
      .populate("assignee", "name email")
      .populate("createdBy", "name email");

    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const commentCount = await Comment.countDocuments({ task: id });
    const taskObj = task.toObject();

    return NextResponse.json({
      task: {
        ...taskObj,
        priority: taskObj.priority || "medium",
        labels: taskObj.labels || [],
        commentCount,
      },
    });
  } catch (error) {
    console.error("PATCH /api/tasks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const ctx = await loadTaskAndVerifyMember(id);

  if (ctx === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = ctx.member.role === "owner";
  const isCreator = ctx.task.createdBy.toString() === ctx.userId;

  if (!isOwner && !isCreator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await Comment.deleteMany({ task: id });
    await Task.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/tasks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
