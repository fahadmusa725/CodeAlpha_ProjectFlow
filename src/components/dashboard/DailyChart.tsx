"use client";

import React, { useState } from "react";

export interface DayStat {
  dateStr: string;
  label: string;
  created: number;
  completed: number;
}

interface DailyChartProps {
  days: DayStat[];
}

export function DailyChart({ days }: DailyChartProps) {
  const [showTable, setShowTable] = useState(false);

  const totalCreated = days.reduce((sum, d) => sum + d.created, 0);
  const totalCompleted = days.reduce((sum, d) => sum + d.completed, 0);
  const totalActivity = totalCreated + totalCompleted;

  const maxVal = Math.max(...days.map((d) => Math.max(d.created, d.completed)), 4);

  // Grid tick values (3-4 ticks)
  const ticks = [0, Math.ceil(maxVal * 0.33), Math.ceil(maxVal * 0.66), maxVal];
  const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);

  const svgWidth = 500;
  const svgHeight = 230;
  const plotX = 35;
  const plotY = 20;
  const plotWidth = 450;
  const plotHeight = 160;

  const groupWidth = plotWidth / days.length;
  const barWidth = 9;
  const barGap = 2;
  const groupPadding = (groupWidth - (barWidth * 2 + barGap)) / 2;

  const ariaLabel = `Created vs completed in the last 14 days. Total created: ${totalCreated}, total completed: ${totalCompleted}.`;

  return (
    <div className="bg-surface border border-border rounded-[6px] p-4 flex flex-col min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text truncate">Created vs completed (last 14 days)</h3>
        <div className="flex items-center gap-3">
          {/* Legend with totals */}
          <div className="flex items-center gap-3 text-xs text-text">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 border-[1.5px] border-accent bg-background rounded-[2px] inline-block" />
              <span>
                Created <strong className="font-semibold">({totalCreated})</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-accent rounded-[2px] inline-block" />
              <span>
                Completed <strong className="font-semibold">({totalCompleted})</strong>
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-expanded={showTable}
            onClick={() => setShowTable((prev) => !prev)}
            className="text-xs font-medium text-accent hover:underline focus-visible:outline-accent rounded-[3px] px-1 py-0.5"
          >
            {showTable ? "Hide table" : "View as table"}
          </button>
        </div>
      </div>

      {totalActivity === 0 && days.length > 0 ? (
        <p className="text-xs text-muted-text py-12 text-center">No created or completed tasks in the last 14 days.</p>
      ) : (
        <>
          {!showTable ? (
            <div className="w-full min-w-0 overflow-hidden">
              <svg
                role="img"
                aria-label={ariaLabel}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto max-h-[320px]"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Y-Axis Gridlines & Ticks */}
                {uniqueTicks.map((tick) => {
                  const tickY = plotY + plotHeight - (tick / maxVal) * plotHeight;
                  return (
                    <g key={tick}>
                      <line
                        x1={plotX}
                        y1={tickY}
                        x2={plotX + plotWidth}
                        y2={tickY}
                        stroke="var(--border)"
                        strokeWidth="1"
                        strokeDasharray={tick === 0 ? undefined : "3 3"}
                      />
                      <text
                        x={plotX - 6}
                        y={tickY + 4}
                        textAnchor="end"
                        fontSize="10px"
                        fill="var(--muted-text)"
                        fontFamily="var(--font-sans), system-ui, sans-serif"
                        className="select-none"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Grouped Bars per Day */}
                {days.map((day, idx) => {
                  const gx = plotX + idx * groupWidth;
                  const createdX = gx + groupPadding;
                  const completedX = createdX + barWidth + barGap;

                  const createdH = (day.created / maxVal) * plotHeight;
                  const createdY = plotY + plotHeight - createdH;

                  const completedH = (day.completed / maxVal) * plotHeight;
                  const completedY = plotY + plotHeight - completedH;

                  // Label on every second day
                  const showLabel = idx % 2 === 0;

                  return (
                    <g key={day.dateStr}>
                      {/* Created Bar (Outlined) */}
                      {day.created > 0 && (
                        <rect
                          x={createdX}
                          y={createdY}
                          width={barWidth}
                          height={createdH}
                          rx={1.5}
                          stroke="var(--accent)"
                          strokeWidth="1.5"
                          fill="var(--background)"
                          className="transition-[height,y] duration-300 motion-reduce:transition-none"
                        />
                      )}

                      {/* Completed Bar (Solid Accent) */}
                      {day.completed > 0 && (
                        <rect
                          x={completedX}
                          y={completedY}
                          width={barWidth}
                          height={completedH}
                          rx={1.5}
                          fill="var(--accent)"
                          className="transition-[height,y] duration-300 motion-reduce:transition-none"
                        />
                      )}

                      {/* X-Axis Day Label (Every 2nd day) */}
                      {showLabel && (
                        <text
                          x={gx + groupWidth / 2}
                          y={plotY + plotHeight + 16}
                          textAnchor="middle"
                          fontSize="10px"
                          fill="var(--muted-text)"
                          fontFamily="var(--font-sans), system-ui, sans-serif"
                          className="select-none"
                        >
                          {day.label}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-left border-collapse border border-border mt-1">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="p-2 font-medium text-text">Date</th>
                    <th className="p-2 font-medium text-text text-right">Created</th>
                    <th className="p-2 font-medium text-text text-right">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {days.map((day) => (
                    <tr key={day.dateStr} className="hover:bg-background/50">
                      <td className="p-2 text-text font-medium">{day.label}</td>
                      <td className="p-2 text-text text-right">{day.created}</td>
                      <td className="p-2 text-text text-right">{day.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
