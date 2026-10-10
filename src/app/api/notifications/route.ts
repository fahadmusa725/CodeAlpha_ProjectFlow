import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Project } from "@/models/Project";
import { Notification } from "@/models/Notification";

export async function GET() {
  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    // Membership check: find projects where current user is a member
    const userProjects = await Project.find({ "members.user": payload.userId }, "_id");
    const projectIds = userProjects.map((p) => p._id);

    const filter = {
      user: payload.userId,
      project: { $in: projectIds },
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("actor", "name");

    const unreadCount = await Notification.countDocuments({
      ...filter,
      read: false,
    });

    const formattedNotifications = notifications.map((n) => {
      const obj = n.toObject();
      let actorObj: { _id: string; name: string } | null = null;
      if (obj.actor && typeof obj.actor === "object" && "_id" in obj.actor && "name" in obj.actor) {
        const a = obj.actor as { _id: { toString(): string }; name: string };
        actorObj = {
          _id: a._id.toString(),
          name: a.name,
        };
      }
      return {
        _id: obj._id.toString(),
        user: obj.user.toString(),
        actor: actorObj,
        type: obj.type,
        project: obj.project.toString(),
        task: obj.task ? obj.task.toString() : undefined,
        message: obj.message,
        read: obj.read,
        createdAt: obj.createdAt ? obj.createdAt.toISOString() : new Date().toISOString(),
      };
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
