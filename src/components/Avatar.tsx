"use client";

import React from "react";

interface AvatarProps {
  name: string;
  userId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const PALETTE = [
  { bg: "#E0E7FF", text: "#3730A3" },
  { bg: "#FEF3C7", text: "#92400E" },
  { bg: "#D1FAE5", text: "#065F46" },
  { bg: "#FCE7F3", text: "#9D174D" },
  { bg: "#E0F2FE", text: "#075985" },
  { bg: "#F3E8FF", text: "#6B21A8" },
  { bg: "#FFEDD5", text: "#9A3412" },
];

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
  const colorIndex = Math.abs(hash) % PALETTE.length;
  const { bg, text } = PALETTE[colorIndex];

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-7 h-7 text-xs",
    lg: "w-9 h-9 text-sm",
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-semibold border border-black/10 select-none ${sizeClasses} ${className}`}
      style={{ backgroundColor: bg, color: text }}
      title={name}
    >
      {initials}
    </div>
  );
}
