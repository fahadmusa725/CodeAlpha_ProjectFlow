import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { requireProjectAccess } from "@/lib/access";
import { createTaskSchema } from "@/lib/validators";
import { getCurrentUser } from "@/lib/auth";
import { publishToProject } from "@/lib/realtime";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  try {
    await connectToDatabase();

    const tasks = await Task.find({ project: id })
      .populate("assignee", "name email")
      .populate("createdBy", "name email")
      .sort({ status: 1, order: 1 });

    const taskIds = tasks.map((t) => t._id);

    const commentCounts = await Comment.aggregate([
      { $match: { task: { $in: taskIds } } },
      { $group: { _id: "$task", count: { $sum: 1 } } },
    ]);

    const commentCountMap = new Map<string, number>();
    for (const item of commentCounts) {
      commentCountMap.set(item._id.toString(), item.count);
    }

    const tasksWithCounts = tasks.map((t) => {
      const obj = t.toObject();
      return {
        ...obj,
        priority: obj.priority || "medium",
        labels: obj.labels || [],
        commentCount: commentCountMap.get(t._id.toString()) || 0,
      };
    });

    return NextResponse.json({ tasks: tasksWithCounts });
  } catch (error) {
    console.error("GET /api/projects/[id]/tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const access = await requireProjectAccess(id);
  if (access instanceof NextResponse) return access;

  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  const { title, description, status = "todo", priority = "medium", labels = [], assignee, dueDate } = parsed.data;

  if (assignee !== undefined && assignee !== null) {
    if (!mongoose.isValidObjectId(assignee)) {
      return NextResponse.json({ error: "Invalid assignee" }, { status: 400 });
    }
    const isMember = access.project.members.some((m) => m.user.toString() === assignee);
    if (!isMember) {
      return NextResponse.json({ error: "Assignee is not a project member" }, { status: 400 });
    }
  }

  try {
    await connectToDatabase();

    const lastTask = await Task.findOne({ project: id, status }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 1;

    const task = await Task.create({
      project: id,
      title,
      description: description ?? "",
      status,
      priority,
      labels,
      assignee: assignee ?? undefined,
      order,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      createdBy: payload.userId,
    });

    const populated = await task.populate([
      { path: "assignee", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    const taskObj = populated.toObject();
    const resultTask = {
      ...taskObj,
      priority: taskObj.priority || "medium",
      labels: taskObj.labels || [],
      commentCount: 0,
    };

    await publishToProject(id, "task.created", {
      actorId: payload.userId,
      task: resultTask,
    });

    return NextResponse.json({
      task: resultTask,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects/[id]/tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
