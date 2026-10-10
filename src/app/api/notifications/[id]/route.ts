import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Notification } from "@/models/Notification";

function makeNotFoundResponse() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(_req: Request, { params }: Params) {
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return makeNotFoundResponse();
  }

  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const notification = await Notification.findOne({
      _id: id,
      user: payload.userId,
    });

    if (!notification) {
      return makeNotFoundResponse();
    }

    notification.read = true;
    await notification.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
