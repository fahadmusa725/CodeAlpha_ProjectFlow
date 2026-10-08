import { NextResponse } from "next/server";
import Ably from "ably";
import { connectToDatabase } from "@/lib/db";
import { Project } from "@/models/Project";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Realtime is not configured" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const payload = await getCurrentUser();
  if (!payload) {
    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  try {
    await connectToDatabase();

    const projects = await Project.find({ "members.user": payload.userId })
      .select("_id")
      .sort({ createdAt: -1 })
      .limit(50);

    const capability: Record<string, string[]> = {};
    for (const proj of projects) {
      capability[`project:${proj._id.toString()}`] = ["subscribe", "presence"];
    }

    const rest = new Ably.Rest({ key: apiKey });
    const tokenRequest = await rest.auth.createTokenRequest({
      clientId: payload.userId,
      ttl: 15 * 60 * 1000, // 15 minutes
      capability: JSON.stringify(capability),
    });

    return NextResponse.json(tokenRequest, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("GET /api/ably/token error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}
