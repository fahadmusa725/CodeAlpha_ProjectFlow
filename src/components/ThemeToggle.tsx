"use client";

import React, { useSyncExternalStore } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleHalfStroke,
  faSun,
  faMoon,
} from "@fortawesome/free-solid-svg-icons";

type ThemeMode = "system" | "light" | "dark";

function subscribeTheme(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  if (media.addEventListener) {
    media.addEventListener("change", callback);
  } else {
    media.addListener(callback);
  }

  return () => {
    window.removeEventListener("storage", callback);
    if (media.removeEventListener) {
      media.removeEventListener("change", callback);
    } else {
      media.removeListener(callback);
    }
  };
}

function getThemeSnapshot(): ThemeMode {
  try {
    const val = localStorage.getItem("theme");
    if (val === "light" || val === "dark") {
      return val;
    }
    return "system";
  } catch {
    return "system";
  }
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getServerSnapshot);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const cycleTheme = () => {
    const nextTheme: ThemeMode =
      theme === "system" ? "light" : theme === "light" ? "dark" : "system";

    try {
      if (nextTheme === "system") {
        localStorage.removeItem("theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("theme", nextTheme);
        document.documentElement.setAttribute("data-theme", nextTheme);
      }
    } catch {
      if (nextTheme === "system") {
        document.documentElement.removeAttribute("data-theme");
      } else {
        document.documentElement.setAttribute("data-theme", nextTheme);
      }
    }

    window.dispatchEvent(new Event("storage"));
  };

  const getAriaLabel = () => {
    if (!isMounted) return "Theme: System (select to cycle)";
    if (theme === "system") return "Theme: System (select to cycle)";
    if (theme === "light") return "Theme: Light (select to cycle)";
    return "Theme: Dark (select to cycle)";
  };

  const icon =
    !isMounted || theme === "system"
      ? faCircleHalfStroke
      : theme === "light"
      ? faSun
      : faMoon;

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
      className={`relative inline-flex items-center justify-center w-[40px] h-[40px] min-w-[40px] min-h-[40px] rounded-[4px] border border-border bg-surface hover:bg-background text-text focus-visible:outline-2 focus-visible:outline-accent transition-colors shrink-0 cursor-pointer ${className}`}
    >
      <FontAwesomeIcon icon={icon} className="w-4 h-4 text-text" />
    </button>
  );
}
