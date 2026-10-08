"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import Ably from "ably";

type ConnectionState = "initialized" | "connecting" | "connected" | "disconnected" | "suspended" | "failed" | "closed" | "off";

interface RealtimeContextType {
  connectionState: ConnectionState;
  realtimeClient: Ably.Realtime | null;
  getChannel: (channelName: string) => Ably.RealtimeChannel | null;
  reauthorize: () => Promise<void>;
}

const RealtimeContext = createContext<RealtimeContextType>({
  connectionState: "off",
  realtimeClient: null,
  getChannel: () => null,
  reauthorize: async () => {},
});

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [realtimeClient, setRealtimeClient] = useState<Ably.Realtime | null>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    let isMounted = true;

    const authCallback = async (
      _data: Ably.TokenParams,
      callback: (error: Ably.ErrorInfo | string | null, tokenRequestOrDetails: Ably.TokenRequest | Ably.TokenDetails | string | null) => void
    ) => {
      try {
        const res = await fetch("/api/ably/token", {
          headers: { "Cache-Control": "no-store" },
          credentials: "same-origin",
        });

        if (res.status === 503) {
          callback("Realtime is not configured", null);
          if (isMounted) setConnectionState("off");
          return;
        }

        if (!res.ok) {
          callback(`Token fetch failed with status ${res.status}`, null);
          return;
        }

        const tokenRequest = await res.json();
        callback(null, tokenRequest);
      } catch (err) {
        callback(err instanceof Error ? err.message : "Auth error", null);
      }
    };

    fetch("/api/ably/token", {
      headers: { "Cache-Control": "no-store" },
      credentials: "same-origin",
    })
      .then((res) => {
        if (!isMounted) return;
        if (res.status === 503) {
          setConnectionState("off");
          return;
        }

        const client = new Ably.Realtime({
          authCallback,
          autoConnect: true,
        });

        clientRef.current = client;
        setRealtimeClient(client);

        client.connection.on((stateChange) => {
          if (!isMounted) return;
          setConnectionState(stateChange.current as ConnectionState);
        });
      })
      .catch(() => {
        if (isMounted) setConnectionState("off");
      });

    return () => {
      isMounted = false;
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
        setRealtimeClient(null);
      }
    };
  }, []);

  const getChannel = useCallback((channelName: string): Ably.RealtimeChannel | null => {
    if (!clientRef.current) return null;
    return clientRef.current.channels.get(channelName);
  }, []);

  const reauthorize = useCallback(async (): Promise<void> => {
    if (clientRef.current) {
      try {
        await clientRef.current.auth.authorize().catch(() => {});
      } catch {
        // Safe catch if authorize fails
      }
    }
  }, []);

  return (
    <RealtimeContext.Provider value={{ connectionState, realtimeClient, getChannel, reauthorize }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  return useContext(RealtimeContext);
}
