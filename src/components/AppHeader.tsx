"use client";

import { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRightFromBracket, faUser } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui";
import { useUser } from "@/components/UserContext";

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

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/projects" className="font-bold text-base text-text tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent inline-block"></span>
            ProjectFlow
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-text bg-background border border-border px-2.5 py-1 rounded-[4px]">
            <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-muted-text" />
            <span>{userName}</span>
          </div>

          <Button
            variant="secondary"
            onClick={handleLogout}
            isLoading={isLoggingOut}
            className="text-xs py-1 px-2.5"
            aria-label="Log out"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-3 h-3 mr-1.5" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
