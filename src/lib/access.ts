import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";
import type { IProject, IProjectMember } from "@/models/Project";

export type ProjectAccess = {
  project: IProject;
  member: IProjectMember;
  role: "owner" | "member";
};

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function requireProjectAccess(
  projectId: string
): Promise<ProjectAccess | NextResponse> {
  if (!mongoose.isValidObjectId(projectId)) return notFound();

  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const project = await Project.findById(projectId);
  if (!project) return notFound();

  const member = project.members.find(
    (m) => m.user.toString() === payload.userId
  );
  if (!member) return notFound();

  return { project, member, role: member.role };
}
