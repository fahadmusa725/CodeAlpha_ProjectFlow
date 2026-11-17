import crypto from "node:crypto";
import { connectToDatabase } from "@/lib/db";
import { Invite, type IInvite } from "@/models/Invite";
import { Project } from "@/models/Project";
import { publishToProject } from "@/lib/realtime";
import type { IUser } from "@/models/User";

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export async function createInvite(
  projectId: string,
  email: string,
  invitedByUserId: string
): Promise<{ invite: IInvite; rawToken: string }> {
  await connectToDatabase();

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const normalizedEmail = email.trim().toLowerCase();

  // Delete older pending invites for the same project and email
  await Invite.deleteMany({
    project: projectId,
    email: normalizedEmail,
    acceptedAt: null,
  });

  const invite = await Invite.create({
    project: projectId,
    email: normalizedEmail,
    invitedBy: invitedByUserId,
    tokenHash,
    expiresAt,
  });

  return { invite, rawToken };
}

export async function findValidInviteByRawToken(
  rawToken: string
): Promise<IInvite | null> {
  if (!rawToken || typeof rawToken !== "string" || rawToken.length !== 64) {
    return null;
  }

  await connectToDatabase();
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  return Invite.findOne({
    tokenHash,
    acceptedAt: null,
    expiresAt: { $gt: now },
  });
}

export async function acceptInvite(
  invite: IInvite,
  user: { _id: string | unknown; name?: string; email?: string } | IUser
): Promise<string> {
  await connectToDatabase();

  const userIdStr = user._id ? user._id.toString() : "";
  const now = new Date();

  // Atomically mark the invite accepted
  await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      acceptedAt: null,
    },
    { acceptedAt: now },
    { new: true }
  );

  // If already accepted elsewhere concurrently, still ensure project membership
  const projectIdStr = (invite.project?._id || invite.project).toString();

  const project = await Project.findById(projectIdStr);
  if (project) {
    const isAlreadyMember = project.members.some(
      (m) => m.user.toString() === userIdStr
    );

    if (!isAlreadyMember) {
      project.members.push({
        user: user._id as unknown as typeof project.members[0]["user"],
        role: "member",
      });
      await project.save();

      try {
        const populated = await project.populate("members.user", "name email");
        const addedMember = populated.members.find(
          (m) => m.user._id.toString() === userIdStr
        );

        await publishToProject(projectIdStr, "member.added", {
          actorId: invite.invitedBy ? invite.invitedBy.toString() : "",
          member: addedMember,
        });
      } catch (err) {
        console.error("Realtime publish failed on invite acceptance:", err);
      }
    }
  }

  return projectIdStr;
}
