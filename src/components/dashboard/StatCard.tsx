"use client";

import React from "react";

interface StatCardProps {
  label: string;
  value: number | string;
  progressBar?: {
    value: number; // 0-100
    ariaLabel: string;
  };
}

export function StatCard({ label, value, progressBar }: StatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-[6px] p-4 flex flex-col justify-between min-w-0">
      <div>
        <p className="text-xs font-medium text-muted-text truncate">{label}</p>
        <p className="text-2xl font-semibold text-text mt-1 tracking-tight">{value}</p>
      </div>
      {progressBar && (
        <div className="mt-3">
          <div
            role="progressbar"
            aria-valuenow={progressBar.value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressBar.ariaLabel}
            className="h-1.5 w-full bg-border rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-accent transition-[width] duration-300 motion-reduce:transition-none"
              style={{ width: `${Math.min(100, Math.max(0, progressBar.value))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
