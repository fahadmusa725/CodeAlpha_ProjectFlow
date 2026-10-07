import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { Project } from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import { createCommentSchema } from "@/lib/validators";

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

  return { task, project, userId: payload.userId };
}

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const ctx = await loadTaskAndVerifyMember(id);

  if (ctx === "unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ctx) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const comments = await Comment.find({ task: id })
      .populate("author", "name email")
      .sort({ createdAt: 1 });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error("GET /api/tasks/[id]/comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
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

  const parsed = createCommentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  try {
    const comment = await Comment.create({
      task: id,
      author: ctx.userId,
      text: parsed.data.text,
    });

    const populated = await comment.populate("author", "name email");

    return NextResponse.json({ comment: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/tasks/[id]/comments:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
