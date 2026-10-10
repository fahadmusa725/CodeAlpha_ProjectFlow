"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import Ably from "ably";
import { useRealtime } from "@/components/RealtimeProvider";
import { useUser } from "@/components/UserContext";
import { apiFetch } from "@/lib/api";
import type { AppNotification, NotificationsListResponse } from "@/types";

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType>({
  notifications: [],
  unreadCount: 0,
  isLoading: true,
  isError: false,
  refetch: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { connectionState, getChannel } = useRealtime();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);

  const isMountedRef = useRef<boolean>(true);
  const prevConnectionStateRef = useRef<string>(connectionState);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      setIsError(false);
      const data = await apiFetch<NotificationsListResponse>("/api/notifications");
      if (!isMountedRef.current) return;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      if (!isMountedRef.current) return;
      setIsError(true);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user]);
  // Initial fetch on mount
  useEffect(() => {
    isMountedRef.current = true;
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);
    return () => {
      isMountedRef.current = false;
      clearTimeout(timer);
    };
  }, [fetchNotifications]);

  // Refetch on reconnect
  useEffect(() => {
    const prevState = prevConnectionStateRef.current;
    prevConnectionStateRef.current = connectionState;

    if (
      connectionState === "connected" &&
      (prevState === "disconnected" || prevState === "suspended" || prevState === "connecting")
    ) {
      fetchNotifications();
    }
  }, [connectionState, fetchNotifications]);

  // Realtime subscription setup
  useEffect(() => {
    if (!user) return;
    let isCancelled = false;

    const channelName = `user:${user.id}`;
    const channel = getChannel(channelName);
    if (!channel) return;

    const handleNotificationCreated = (msg: Ably.Message) => {
      if (isCancelled) return;
      const newItem = msg.data as AppNotification;
      if (!newItem || !newItem._id) return;

      setNotifications((prev) => {
        if (prev.some((item) => item._id === newItem._id)) {
          return prev;
        }
        return [newItem, ...prev];
      });

      if (!newItem.read) {
        setUnreadCount((count) => count + 1);
      }
    };

    channel
      .subscribe("notification.created", handleNotificationCreated)
      .catch(() => {});

    return () => {
      isCancelled = true;
      channel.unsubscribe("notification.created", handleNotificationCreated);
    };
  }, [user, getChannel]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((item) => (item._id === id ? { ...item, read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      // Ignore failure per spec
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);

    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
    } catch {
      // Ignore failure
    }
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        isError,
        refetch: fetchNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
