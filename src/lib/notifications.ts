import { connectToDatabase } from "@/lib/db";
import { Notification } from "@/models/Notification";
import { publishToUser } from "@/lib/realtime";

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
  } catch (error) {
    console.error("createNotifications failed:", error instanceof Error ? error.message : "Unknown error");
  }
}
