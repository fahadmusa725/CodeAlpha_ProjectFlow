import React from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { AppHeader } from "@/components/AppHeader";
import { UserProvider } from "@/components/UserContext";
import { ToastProvider } from "@/components/ui";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  const user = {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    isAdmin: true,
  };

  return (
    <UserProvider user={user}>
      <ToastProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <AppHeader userName={admin.name} />
          <div className="border-b border-border bg-surface">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between gap-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-text px-2 py-0.5 rounded bg-background border border-border mr-2">
                  Admin
                </span>
                <Link
                  href="/admin"
                  className="text-xs font-medium text-muted-text hover:text-text px-2.5 py-1.5 rounded-[4px] hover:bg-background transition-colors"
                >
                  Overview
                </Link>
                <Link
                  href="/admin/users"
                  className="text-xs font-medium text-muted-text hover:text-text px-2.5 py-1.5 rounded-[4px] hover:bg-background transition-colors"
                >
                  Users
                </Link>
                <Link
                  href="/admin/projects"
                  className="text-xs font-medium text-muted-text hover:text-text px-2.5 py-1.5 rounded-[4px] hover:bg-background transition-colors"
                >
                  Projects
                </Link>
              </div>
              <span className="text-[11px] text-muted-text hidden sm:inline">
                Read-only admin mode
              </span>
            </div>
          </div>
          <main className="flex-1 min-w-0 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
            {children}
          </main>
        </div>
      </ToastProvider>
    </UserProvider>
  );
}
