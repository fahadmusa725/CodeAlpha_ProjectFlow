import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { publishToUser } from "@/lib/realtime";
import { isMailConfigured, sendMail, escapeHtml } from "@/lib/mail";
import { hit, hashKeyPart } from "@/lib/rate-limit";
import { after } from "next/server";

export interface CreateNotificationItem {
  user: string;
  actor: string;
  type: "assigned" | "comment" | "added_to_project";
  project: string;
  task?: string;
  actorName: string;
  targetTitle: string; // task title or project name
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen);
}

async function sendAssignmentEmail(item: CreateNotificationItem): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const recipientUser = await User.findById(item.user).select("email name");
    if (!recipientUser || !recipientUser.email) return;

    if (recipientUser.email.endsWith("@projectflow.demo")) return;

    // Per-recipient throttle: "mail:assign:<hash of recipient id>" max 10 per hour
    const recipientIdHash = hashKeyPart(item.user);
    const throttleLimit = await hit(`mail:assign:${recipientIdHash}`, 10, 60 * 60 * 1000);
    if (throttleLimit.limited) return;

    let projectName = "Project";
    try {
      const projectDoc = await Project.findById(item.project).select("name");
      if (projectDoc?.name) {
        projectName = projectDoc.name;
      }
    } catch {
      // keep fallback projectName
    }

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const taskLink = `${appUrl}/projects/${item.project}?task=${item.task}`;

    const actorNameTruncated = truncate(item.actorName, 120);
    const taskTitleTruncated = truncate(item.targetTitle, 120);
    const projectNameTruncated = truncate(projectName, 120);

    const subject = `${actorNameTruncated} assigned you a task`;
    const text = `Hello ${recipientUser.name},\n\n${item.actorName} assigned you to the task "${taskTitleTruncated}" in project "${projectNameTruncated}".\n\nView the task here:\n${taskLink}\n\nProjectFlow Team`;
    const html = `<p>Hello ${escapeHtml(recipientUser.name)},</p><p><strong>${escapeHtml(item.actorName)}</strong> assigned you to the task &ldquo;<strong>${escapeHtml(taskTitleTruncated)}</strong>&rdquo; in project &ldquo;<strong>${escapeHtml(projectNameTruncated)}</strong>&rdquo;.</p><p><a href="${taskLink}">View Task</a></p><p>&mdash;<br>ProjectFlow Team</p>`;

    await sendMail({
      to: recipientUser.email,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("Assignment email error:", err instanceof Error ? err.message : "Unknown error");
  }
}

async function sendAddedToProjectEmail(item: CreateNotificationItem): Promise<void> {
  if (!isMailConfigured()) return;

  try {
    const recipientUser = await User.findById(item.user).select("email name");
    if (!recipientUser || !recipientUser.email) return;

    if (recipientUser.email.endsWith("@projectflow.demo")) return;

    // Per-recipient throttle: "mail:added:<hash of recipient id>" max 10 per hour
    const recipientIdHash = hashKeyPart(item.user);
    const throttleLimit = await hit(`mail:added:${recipientIdHash}`, 10, 60 * 60 * 1000);
    if (throttleLimit.limited) return;

    let projectName = item.targetTitle || "Project";
    try {
      const projectDoc = await Project.findById(item.project).select("name");
      if (projectDoc?.name) {
        projectName = projectDoc.name;
      }
    } catch {
      // keep fallback
    }

    const appUrl = (process.env.APP_URL || "").trim().replace(/\/+$/, "");
    const projectLink = `${appUrl}/projects/${item.project}`;

    const actorNameTruncated = truncate(item.actorName, 60);
    const projectNameTruncated = truncate(projectName, 60);

    const subject = `${actorNameTruncated} added you to ${projectNameTruncated}`;
    const text = `Hello ${recipientUser.name},\n\n${item.actorName} added you to the project "${projectNameTruncated}".\n\nView the project here:\n${projectLink}\n\nProjectFlow Team`;
    const html = `<p>Hello ${escapeHtml(recipientUser.name)},</p><p><strong>${escapeHtml(item.actorName)}</strong> added you to the project &ldquo;<strong>${escapeHtml(projectNameTruncated)}</strong>&rdquo;.</p><p><a href="${projectLink}">View Project</a></p><p>&mdash;<br>ProjectFlow Team</p>`;

    await sendMail({
      to: recipientUser.email,
      subject,
      text,
      html,
    });
  } catch (err) {
    console.error("Added to project email error:", err instanceof Error ? err.message : "Unknown error");
  }
}

export async function createNotifications(items: CreateNotificationItem[]): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    await connectToDatabase();

    const docsToInsert = items.map((item) => {
      const truncatedTitle = truncate(item.targetTitle, 60);
      let message = "";
      if (item.type === "assigned") {
        message = `${item.actorName} assigned you to "${truncatedTitle}"`;
      } else if (item.type === "comment") {
        message = `${item.actorName} commented on "${truncatedTitle}"`;
      } else if (item.type === "added_to_project") {
        message = `${item.actorName} added you to "${truncatedTitle}"`;
      }

      return {
        user: item.user,
        actor: item.actor,
        type: item.type,
        project: item.project,
        task: item.task || undefined,
        message,
        read: false,
      };
    });

    const inserted = await Notification.insertMany(docsToInsert);

    for (let i = 0; i < inserted.length; i++) {
      const doc = inserted[i];
      const item = items[i];

      const payload = {
        _id: doc._id.toString(),
        user: doc.user.toString(),
        actor: {
          _id: item.actor,
          name: item.actorName,
        },
        type: doc.type,
        project: doc.project.toString(),
        task: doc.task ? doc.task.toString() : undefined,
        message: doc.message,
        read: doc.read,
        createdAt: doc.createdAt.toISOString(),
      };

      await publishToUser(doc.user.toString(), "notification.created", payload);
    }

    const assignedItems = items.filter((it) => it.type === "assigned" && it.task);
    const addedItems = items.filter((it) => it.type === "added_to_project");

    if ((assignedItems.length > 0 || addedItems.length > 0) && isMailConfigured()) {
      after(async () => {
        for (const assignedItem of assignedItems) {
          await sendAssignmentEmail(assignedItem);
        }
        for (const addedItem of addedItems) {
          await sendAddedToProjectEmail(addedItem);
        }
      });
    }
  } catch (error) {
    console.error("createNotifications failed:", error instanceof Error ? error.message : "Unknown error");
  }
}
