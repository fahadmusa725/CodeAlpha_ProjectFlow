"use client";

import React, { useState } from "react";

export interface BarChartItem {
  label: string;
  count: number;
  subtext?: string;
}

interface BarChartProps {
  title: string;
  data: BarChartItem[];
  valueHeader?: string;
}

export function BarChart({ title, data, valueHeader = "Count" }: BarChartProps) {
  const [showTable, setShowTable] = useState(false);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);

  const rowHeight = 32;
  const padding = 12;
  const labelWidth = 110;
  const barAreaWidth = 210;
  const svgWidth = 440;
  const svgHeight = Math.max(data.length * rowHeight + padding * 2, 80);

  const ariaLabel = `${title}: ${
    data.length === 0
      ? "No data"
      : data.map((d) => `${d.label}: ${d.count}${d.subtext ? ` (${d.subtext})` : ""}`).join(", ")
  }`;

  return (
    <div className="bg-surface border border-border rounded-[6px] p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text truncate">{title}</h3>
        <button
          type="button"
          aria-expanded={showTable}
          onClick={() => setShowTable((prev) => !prev)}
          className="text-xs font-medium text-accent hover:underline focus-visible:outline-accent rounded-[3px] px-1 py-0.5"
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      {totalCount === 0 || data.length === 0 ? (
        <p className="text-xs text-muted-text py-8 text-center">No data available for this chart.</p>
      ) : (
        <>
          {!showTable ? (
            <div className="w-full min-w-0 overflow-hidden">
              <svg
                role="img"
                aria-label={ariaLabel}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto max-h-[300px]"
                preserveAspectRatio="xMidYMid meet"
              >
                {data.map((item, idx) => {
                  const y = padding + idx * rowHeight;
                  const barWidth = Math.round((item.count / maxCount) * barAreaWidth);
                  const barX = labelWidth + 10;
                  const textX = barX + barWidth + 8;
                  const valueString = `${item.count}${item.subtext ? ` (${item.subtext})` : ""}`;

                  return (
                    <g key={item.label + idx}>
                      {/* Category Label */}
                      <text
                        x={labelWidth}
                        y={y + 17}
                        textAnchor="end"
                        fill="var(--text)"
                        fontSize="12px"
                        fontFamily="var(--font-sans), system-ui, sans-serif"
                        className="select-none"
                      >
                        {item.label.length > 15 ? `${item.label.slice(0, 14)}…` : item.label}
                      </text>

                      {/* Bar Track */}
                      <rect
                        x={barX}
                        y={y + 4}
                        width={barAreaWidth}
                        height={18}
                        rx={3}
                        fill="var(--border)"
                        opacity={0.4}
                      />

                      {/* Filled Bar */}
                      {barWidth > 0 && (
                        <rect
                          x={barX}
                          y={y + 4}
                          width={barWidth}
                          height={18}
                          rx={3}
                          fill="var(--accent)"
                          className="transition-[width] duration-300 motion-reduce:transition-none"
                        />
                      )}

                      {/* Value Text */}
                      <text
                        x={textX}
                        y={y + 17}
                        fill="var(--text)"
                        fontSize="11px"
                        fontWeight="500"
                        fontFamily="var(--font-sans), system-ui, sans-serif"
                        className="select-none"
                      >
                        {valueString}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse border border-border mt-1">
                <thead>
                  <tr className="bg-background border-b border-border">
                    <th className="p-2 font-medium text-text">Category</th>
                    <th className="p-2 font-medium text-text text-right">{valueHeader}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-background/50">
                      <td className="p-2 text-text font-medium">{item.label}</td>
                      <td className="p-2 text-text text-right">
                        {item.count}
                        {item.subtext ? ` (${item.subtext})` : ""}
                      </td>
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
