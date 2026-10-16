import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminEmailsEnv = process.env.ADMIN_EMAILS;
  if (!adminEmailsEnv) return false;

  const parsedList = adminEmailsEnv
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (parsedList.length === 0) return false;

  return parsedList.includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) {
    notFound();
  }

  let payload: { userId: string } | null = null;
  try {
    payload = await verifyToken(token);
  } catch {
    notFound();
  }

  if (!payload?.userId) {
    notFound();
  }

  await connectToDatabase();
  const user = await User.findById(payload.userId).select("email name");
  if (!user || !user.email) {
    notFound();
  }

  if (!isAdminEmail(user.email)) {
    notFound();
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };
}
