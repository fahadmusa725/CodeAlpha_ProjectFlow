"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faCircleInfo, faCircleExclamation } from "@fortawesome/free-solid-svg-icons";

export interface ToastMessage {
  id: string;
  type?: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "error") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3 rounded-[6px] border shadow-md text-xs font-medium transition-all ${
              toast.type === "error"
                ? "bg-surface border-danger/30 text-danger"
                : toast.type === "success"
                ? "bg-surface border-accent/30 text-accent"
                : "bg-surface border-border text-text"
            }`}
          >
            <div className="flex items-center gap-2">
              <FontAwesomeIcon
                icon={toast.type === "error" ? faCircleExclamation : faCircleInfo}
                className="w-3.5 h-3.5 flex-shrink-0"
              />
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-muted-text hover:text-text p-1 rounded transition-colors focus-visible:outline-accent"
              aria-label="Dismiss notification"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
