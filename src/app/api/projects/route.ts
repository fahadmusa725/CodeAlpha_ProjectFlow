import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { getCurrentUser } from "@/lib/auth";
import { createProjectSchema } from "@/lib/validators";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const projects = await Project.find({ "members.user": payload.userId })
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    const projectIds = projects.map((p) => p._id);

    const taskStats = await Task.aggregate([
      { $match: { project: { $in: projectIds } } },
      {
        $group: {
          _id: "$project",
          taskCount: { $sum: 1 },
          doneCount: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] },
          },
        },
      },
    ]);

    const statsMap = new Map<string, { taskCount: number; doneCount: number }>();
    for (const stat of taskStats) {
      statsMap.set(stat._id.toString(), {
        taskCount: stat.taskCount,
        doneCount: stat.doneCount,
      });
    }

    const projectsWithCounts = projects.map((p) => {
      const obj = p.toObject();
      const stat = statsMap.get(p._id.toString()) || { taskCount: 0, doneCount: 0 };
      return {
        ...obj,
        taskCount: stat.taskCount,
        doneCount: stat.doneCount,
      };
    });

    return NextResponse.json({ projects: projectsWithCounts });
  } catch (error) {
    console.error("GET /api/projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

  const parsed = createProjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const project = await Project.create({
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      owner: payload.userId,
      members: [{ user: payload.userId, role: "owner" }],
    });

    const populated = await project.populate("members.user", "name email");

    return NextResponse.json({ project: populated }, { status: 201 });
  } catch (error) {
    console.error("POST /api/projects:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
