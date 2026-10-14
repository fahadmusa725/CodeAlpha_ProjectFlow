"use client";

import React from "react";

interface AvatarProps {
  name: string;
  userId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PALETTE_COUNT = 7;

export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, userId, size = "md", className = "" }: AvatarProps) {
  const initials = getInitials(name);

  let hash = 0;
  const key = userId || name || "";
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorIndex = Math.abs(hash) % PALETTE_COUNT;

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-7 h-7 text-xs",
    lg: "w-9 h-9 text-sm",
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold border border-border select-none ${sizeClasses} ${className}`}
      style={{
        backgroundColor: `var(--avatar-${colorIndex}-bg)`,
        color: `var(--avatar-${colorIndex}-text)`,
      }}
      title={name}
    >
      {initials}
    </div>
  );
}
