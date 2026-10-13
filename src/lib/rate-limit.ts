import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { RateLimit } from "@/models/RateLimit";

export interface RateLimitResult {
  limited: boolean;
  retryAfterSeconds: number;
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export function hashKeyPart(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export function tooManyRequests(retryAfterSeconds: number): NextResponse {
  return NextResponse.json(
    { error: "Too many attempts. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export async function reset(key: string): Promise<void> {
  try {
    await connectToDatabase();
    await RateLimit.deleteOne({ key });
  } catch (error) {
    console.error("Rate limit reset error:", error);
  }
}

async function performHit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + windowMs);

  // Delete expired window for this key before upserting so unpurged TTL documents
  // do not trigger duplicate key (11000) errors.
  await RateLimit.deleteOne({ key, expiresAt: { $lte: now } });

  const doc = await RateLimit.findOneAndUpdate(
    { key, expiresAt: { $gt: now } },
    {
      $inc: { count: 1 },
      $setOnInsert: { key, expiresAt },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  const count = doc?.count ?? 1;
  const docExpiresAt = doc?.expiresAt ? new Date(doc.expiresAt) : expiresAt;
  const remainingMs = Math.max(0, docExpiresAt.getTime() - now.getTime());
  const retryAfterSeconds = Math.max(1, Math.ceil(remainingMs / 1000));

  return {
    limited: count > max,
    retryAfterSeconds,
  };
}

export async function hit(
  key: string,
  max: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    await connectToDatabase();
    try {
      return await performHit(key, max, windowMs);
    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: unknown }).code === 11000
      ) {
        // Retry once on race condition duplicate key error
        return await performHit(key, max, windowMs);
      }
      throw err;
    }
  } catch (error) {
    // Fail open: log error without secrets and allow request
    console.error("Rate limiter failure (allowing request):", error);
    return {
      limited: false,
      retryAfterSeconds: 0,
    };
  }
}
