import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { requireProjectAccess } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { addMemberSchema } from "@/lib/validators";
import { publishToProject } from "@/lib/realtime";
import { createNotifications } from "@/lib/notifications";
import { isMailConfigured, sendMail, escapeHtml } from "@/lib/mail";
import { hit, getClientIp, hashKeyPart, tooManyRequests } from "@/lib/rate-limit";
import { createInvite } from "@/lib/invites";

type Params = { params: Promise<{ id: string }> };

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

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

  const email = parsed.data.email;

  try {
    await connectToDatabase();

    const userToAdd = await User.findOne({ email });

    if (userToAdd) {
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
      const addedMember = populated.members.find((m) => m.user._id.toString() === userToAdd._id.toString());

      const payload = await getCurrentUser();
      await publishToProject(id, "member.added", {
        actorId: payload?.userId || "",
        member: addedMember,
      });

      if (payload?.userId && userToAdd._id.toString() !== payload.userId) {
        try {
          const actorUser = await User.findById(payload.userId, "name");
          await createNotifications([
            {
              user: userToAdd._id.toString(),
              actor: payload.userId,
              type: "added_to_project",
              project: id,
              actorName: actorUser?.name || "Someone",
              targetTitle: project.name,
            },
          ]);
        } catch (err) {
          console.error("Failed to create added_to_project notification:", err);
        }
      }

      return NextResponse.json({ project: populated }, { status: 201 });
    }

    // User does NOT exist: Invitation flow
    if (!isMailConfigured()) {
      return NextResponse.json(
        { error: "Email is not configured, so invitations cannot be sent." },
        { status: 503 }
      );
    }

    if (email.endsWith("@projectflow.demo")) {
      return NextResponse.json(
        { error: "Invitations cannot be sent to demo email addresses." },
        { status: 400 }
      );
    }

    const payload = await getCurrentUser();
    const ownerId = payload?.userId || "";
    const clientIp = getClientIp(req);

    // Rate limits
    // 1. "invite:owner:<hash of owner id>" max 10 per hour (3,600,000 ms)
    const ownerLimit = await hit(`invite:owner:${hashKeyPart(ownerId)}`, 10, 60 * 60 * 1000);
    if (ownerLimit.limited) {
      return tooManyRequests(ownerLimit.retryAfterSeconds);
    }

    // 2. "invite:email:<hash of invited email>" max 2 per 24 hours (86,400,000 ms)
    const emailLimit = await hit(`invite:email:${hashKeyPart(email)}`, 2, 24 * 60 * 60 * 1000);
    if (emailLimit.limited) {
      return tooManyRequests(emailLimit.retryAfterSeconds);
    }

    // 3. "invite:ip:<ip>" max 20 per hour (3,600,000 ms)
    const ipLimit = await hit(`invite:ip:${clientIp}`, 20, 60 * 60 * 1000);
    if (ipLimit.limited) {
      return tooManyRequests(ipLimit.retryAfterSeconds);
    }

    const { invite, rawToken } = await createInvite(id, email, ownerId);

    const ownerUser = await User.findById(ownerId).select("name");
    const ownerName = truncate(ownerUser?.name || "A team member", 60);
    const projectName = truncate(access.project.name, 60);

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const inviteLink = `${appUrl}/invite/${rawToken}`;

    const subject = `${ownerName} invited you to join ${projectName} on ProjectFlow`;
    const text = `Hello,\n\n${ownerName} has invited you to join the project "${projectName}" on ProjectFlow.\n\nAccept your invitation and set up your account by clicking the link below:\n${inviteLink}\n\nThis invitation will expire in 7 days. If you were not expecting this invitation, you can safely ignore this email.\n\nProjectFlow Team`;
    const html = `<p>Hello,</p><p><strong>${escapeHtml(ownerName)}</strong> has invited you to join the project &ldquo;<strong>${escapeHtml(projectName)}</strong>&rdquo; on ProjectFlow.</p><p><a href="${inviteLink}">Join ${escapeHtml(projectName)}</a></p><p>This invitation will expire in 7 days. If you were not expecting this invitation, you can safely ignore this email.</p><p>&mdash;<br>ProjectFlow Team</p>`;

    const mailSent = await sendMail({
      to: email,
      subject,
      text,
      html,
    });

    if (!mailSent) {
      await invite.deleteOne();
      return NextResponse.json(
        { error: "Could not send the email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ invited: true, email }, { status: 202 });
  } catch (error) {
    console.error("POST /api/projects/[id]/members:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
