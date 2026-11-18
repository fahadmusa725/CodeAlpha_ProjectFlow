import crypto from "node:crypto";
import mongoose from "mongoose";
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
  user: { _id: string | mongoose.Types.ObjectId | unknown; name?: string; email?: string } | IUser
): Promise<string | null> {
  await connectToDatabase();

  const userId = user._id as mongoose.Types.ObjectId | string;
  const now = new Date();

  // Atomically claim the invite: only if acceptedAt is not set and not expired
  const claimedInvite = await Invite.findOneAndUpdate(
    {
      _id: invite._id,
      acceptedAt: null,
      expiresAt: { $gt: now },
    },
    { acceptedAt: now },
    { new: true }
  );

  // If already used or expired concurrently, return null
  if (!claimedInvite) {
    return null;
  }

  const projectId = claimedInvite.project;
  const projectIdStr = projectId.toString();

  try {
    // Atomically add user if not already a member to prevent duplicates
    await Project.updateOne(
      {
        _id: projectId,
        "members.user": { $ne: userId as unknown as mongoose.Types.ObjectId },
      },
      {
        $push: {
          members: { user: userId as unknown as mongoose.Types.ObjectId, role: "member" },
        },
      }
    );

    // Keep realtime publish
    try {
      const addedMember = {
        user: {
          _id: userId ? userId.toString() : "",
          name: user.name || "",
          email: user.email || "",
        },
        role: "member" as const,
      };

      await publishToProject(projectIdStr, "member.added", {
        actorId: claimedInvite.invitedBy ? claimedInvite.invitedBy.toString() : "",
        member: addedMember,
      });
    } catch (err) {
      console.error("Realtime publish failed on invite acceptance:", err);
    }

    return projectIdStr;
  } catch (err) {
    // Roll back acceptedAt so link still works
    await Invite.updateOne({ _id: claimedInvite._id }, { acceptedAt: null });
    throw err;
  }
}
