"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { useNotifications } from "@/components/NotificationsProvider";
import { Button } from "@/components/ui";
import type { AppNotification } from "@/types";

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (diffInSeconds < 60) {
      return rtf.format(-Math.max(1, diffInSeconds), "second");
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return rtf.format(-diffInMinutes, "minute");
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return rtf.format(-diffInHours, "hour");
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return rtf.format(-diffInDays, "day");
    }
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return rtf.format(-diffInMonths, "month");
    }
    const diffInYears = Math.floor(diffInDays / 365);
    return rtf.format(-diffInYears, "year");
  } catch {
    return "just now";
  }
}

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, isError, refetch, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        refetch();
      }
      return next;
    });
  }, [refetch]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    bellRef.current?.focus();
  }, []);

  // Keyboard navigation & outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDropdown();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  const handleItemClick = (item: AppNotification) => {
    if (!item.read) {
      markAsRead(item._id);
    }
    setIsOpen(false);
    let targetUrl = `/projects/${item.project}`;
    if (item.task) {
      targetUrl += `?task=${item.task}`;
    }
    router.push(targetUrl);
  };

  const badgeText = unreadCount > 9 ? "9+" : unreadCount > 0 ? unreadCount.toString() : null;

  return (
    <div className="relative inline-block">
      <button
        ref={bellRef}
        type="button"
        onClick={toggleDropdown}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="relative flex items-center justify-center w-[40px] h-[40px] rounded-[4px] border border-border bg-background hover:bg-surface text-text focus:outline-none focus:ring-2 focus:ring-accent transition-colors shrink-0"
      >
        <FontAwesomeIcon icon={faBell} className="w-4 h-4 text-muted-text" />
        {badgeText && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none">
            {badgeText}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          role="region"
          aria-label="Notifications"
          className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-full sm:mt-2 w-[calc(100vw-16px)] sm:w-[360px] max-h-[70dvh] flex flex-col bg-surface border border-border rounded-[6px] shadow-lg z-50 overflow-hidden text-sm"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface shrink-0">
            <h2 className="font-semibold text-text text-sm m-0">Notifications</h2>
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="text-xs font-medium text-accent hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed border-none bg-transparent p-0 cursor-pointer"
            >
              Mark all as read
            </button>
          </div>

          {/* List content area */}
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border">
            {isLoading && (
              <div className="p-6 text-center text-muted-text text-xs">
                Loading notifications...
              </div>
            )}

            {!isLoading && isError && (
              <div className="p-6 text-center text-xs space-y-2">
                <p className="text-muted-text m-0">Failed to load notifications.</p>
                <Button variant="secondary" onClick={refetch} className="text-xs py-1 px-2.5">
                  <FontAwesomeIcon icon={faRotateRight} className="w-3 h-3 mr-1.5" />
                  Retry
                </Button>
              </div>
            )}

            {!isLoading && !isError && notifications.length === 0 && (
              <div className="p-6 text-center text-muted-text text-xs">
                No notifications yet
              </div>
            )}

            {!isLoading &&
              !isError &&
              notifications.map((item) => {
                const isUnread = !item.read;
                return (
                  <button
                    key={item._id}
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left p-3 flex items-start gap-3 transition-colors cursor-pointer border-none bg-transparent hover:bg-background/80 ${
                      isUnread ? "bg-accent/5 border-l-4 border-l-accent pl-2" : "pl-3"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-snug m-0 ${
                          isUnread ? "font-semibold text-text" : "font-normal text-muted-text"
                        }`}
                      >
                        {isUnread && <span className="sr-only">Unread: </span>}
                        {item.message}
                      </p>
                      <span className="text-[11px] text-muted-text mt-1 block">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
