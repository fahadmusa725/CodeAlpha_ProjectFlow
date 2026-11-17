import type { Metadata } from "next";
import Link from "next/link";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { findValidInviteByRawToken } from "@/lib/invites";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { InviteRegisterForm } from "./InviteRegisterForm";
import { AcceptInviteButton } from "./AcceptInviteButton";

export const metadata: Metadata = {
  title: "Project Invitation - ProjectFlow",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
  },
};

type Params = { params: Promise<{ token: string }> };

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  const maskedLocal = local.length > 1 ? `${local[0]}***` : "*";
  return `${maskedLocal}@${domain}`;
}

export default async function InvitePage({ params }: Params) {
  const { token } = await params;

  await connectToDatabase();

  const invite = await findValidInviteByRawToken(token);

  if (!invite) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-text">ProjectFlow</h1>
          </div>
          <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Invalid invitation</h2>
              <p className="text-xs text-muted-text mt-1">
                This invitation link is invalid or has expired.
              </p>
            </div>
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
              The link you followed has either expired after 7 days, already been used, or contains an incorrect security token.
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center text-sm font-medium text-text bg-surface border border-border hover:bg-background rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
            >
              Go to home page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [project, inviter] = await Promise.all([
    Project.findById(invite.project).select("name"),
    User.findById(invite.invitedBy).select("name"),
  ]);

  const projectName = project?.name || "a project";
  const inviterName = inviter?.name || "A team member";

  const session = await getCurrentUser();
  let sessionUser = null;
  if (session?.userId) {
    sessionUser = await User.findById(session.userId).select("email name");
  }

  // State 4 & 5: Logged in
  if (sessionUser && sessionUser.email) {
    const isSameEmail = sessionUser.email.toLowerCase() === invite.email.toLowerCase();

    if (isSameEmail) {
      // State 4: Logged in as invited email
      return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold tracking-tight text-text">ProjectFlow</h1>
            </div>
            <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-semibold text-text">Join {projectName}</h2>
                <p className="text-xs text-muted-text mt-1">
                  <strong>{inviterName}</strong> invited you to collaborate on <strong>{projectName}</strong>.
                </p>
              </div>

              <div className="text-xs text-muted-text bg-background border border-border p-2.5 rounded-[4px]">
                Signed in as <strong>{sessionUser.email}</strong>
              </div>

              <AcceptInviteButton token={token} projectName={projectName} />
            </div>
          </div>
        </div>
      );
    }

    // State 5: Logged in as different email
    const maskedTarget = maskEmail(invite.email);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-text">ProjectFlow</h1>
          </div>
          <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Different account detected</h2>
              <p className="text-xs text-muted-text mt-1">
                This invitation was sent to another email address ({maskedTarget}).
              </p>
            </div>

            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px] leading-relaxed">
              You are currently logged in as <strong>{sessionUser.email}</strong>. Please sign out and open the invitation link again to accept it.
            </div>

            <div className="flex flex-col gap-2">
              <Link
                href="/api/auth/logout"
                className="inline-flex items-center justify-center text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
              >
                Log out
              </Link>
              <Link
                href="/projects"
                className="inline-flex items-center justify-center text-sm font-medium text-text bg-surface border border-border hover:bg-background rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
              >
                Back to projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged out states
  const existingUser = await User.findOne({ email: invite.email.toLowerCase() }).select("_id");

  // State 3: Valid, logged out, and a user with that email already exists
  if (existingUser) {
    const encodedFrom = encodeURIComponent(`/invite/${token}`);
    return (
      <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
        <div className="w-full max-w-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight text-text">ProjectFlow</h1>
          </div>
          <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold text-text">Project invitation</h2>
              <p className="text-xs text-muted-text mt-1">
                <strong>{inviterName}</strong> invited you to join <strong>{projectName}</strong>.
              </p>
            </div>

            <p className="text-xs text-muted-text leading-relaxed">
              An account with the email <strong>{invite.email}</strong> already exists. Please log in to accept your invitation and join the project.
            </p>

            <Link
              href={`/login?from=${encodedFrom}`}
              className="inline-flex items-center justify-center text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-[4px] px-3.5 py-1.5 transition-colors text-center"
            >
              Log in to join
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Valid, logged out, and no user has that email
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold tracking-tight text-text">ProjectFlow</h1>
        </div>
        <div className="bg-surface border border-border rounded-[6px] p-6 shadow-sm flex flex-col gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text">Accept invitation</h2>
            <p className="text-xs text-muted-text mt-1">
              <strong>{inviterName}</strong> invited you to collaborate on <strong>{projectName}</strong>.
            </p>
          </div>

          <InviteRegisterForm email={invite.email} inviteToken={token} />
        </div>
      </div>
    </div>
  );
}
