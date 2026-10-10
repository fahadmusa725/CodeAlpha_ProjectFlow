"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui";
import { useUser } from "@/components/UserContext";
import { NotificationBell } from "@/components/NotificationBell";

interface AppHeaderProps {
  userName?: string;
}

export function AppHeader({ userName: propUserName }: AppHeaderProps) {
  const { user } = useUser();
  const userName = propUserName || user?.name || "User";
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {
      // disregard errors and force redirect
    } finally {
      window.location.assign("/login");
    }
  };

  const initials = userName
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between min-w-0 gap-2">
        <div className="flex items-center gap-6 shrink-0">
          <Link href="/projects" className="font-bold text-base text-text tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
            ProjectFlow
          </Link>
        </div>

        <div className="flex items-center gap-2 min-w-0">
          <NotificationBell />

          {/* User pill: initials only on narrow screens, full name from sm */}
          <div
            className="flex items-center gap-2 text-xs font-medium text-text bg-background border border-border px-2 sm:px-2.5 py-1 rounded-[4px] min-w-0"
            aria-label={`Logged in as ${userName}`}
          >
            <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-muted-text shrink-0" />
            <span className="hidden sm:inline truncate max-w-[160px]">{userName}</span>
            <span className="sm:hidden font-semibold">{initials}</span>
          </div>

          {/* Logout: icon + text from sm, icon-only below */}
          <Button
            variant="secondary"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="text-xs py-1 px-2 sm:px-2.5 shrink-0"
            aria-label="Log out"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 sm:mr-1.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
