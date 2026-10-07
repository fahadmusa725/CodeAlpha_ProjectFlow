import React from "react";
import { headers } from "next/headers";
import { AppHeader } from "@/components/AppHeader";
import type { AuthMeResponse } from "@/types";

async function getCurrentUser(): Promise<AuthMeResponse["user"] | null> {
  try {
    const reqHeaders = await headers();
    const cookieHeader = reqHeaders.get("cookie");

    const host = reqHeaders.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";

    const res = await fetch(`${protocol}://${host}/api/auth/me`, {
      headers: {
        cookie: cookieHeader || "",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;
    const data: AuthMeResponse = await res.json();
    return data.user;
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader userName={user?.name || "User"} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}
