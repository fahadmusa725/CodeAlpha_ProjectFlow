import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
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

    return NextResponse.json({ projects });
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
