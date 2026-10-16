import React from "react";
import { requireAdmin } from "@/lib/admin";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Project } from "@/models/Project";
import { Task } from "@/models/Task";
import { Comment } from "@/models/Comment";
import { StatCard } from "@/components/dashboard/StatCard";

interface DailyBucket {
  dateStr: string;
  label: string;
  count: number;
}

function getUtcLast14Days(): { startUtc: Date; days: { dateStr: string; label: string }[] } {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const days: { dateStr: string; label: string }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayUtc.getTime() - i * 86400000);
    const dateStr = d.toISOString().split("T")[0];
    const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    const day = d.getUTCDate();
    days.push({
      dateStr,
      label: `${month} ${day}`,
    });
  }

  const startUtc = new Date(todayUtc.getTime() - 13 * 86400000);
  return { startUtc, days };
}

function SimpleBarChart({
  title,
  days,
  emptyMessage,
}: {
  title: string;
  days: DailyBucket[];
  emptyMessage: string;
}) {
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const maxVal = Math.max(...days.map((d) => d.count), 1);

  const svgWidth = 460;
  const svgHeight = 160;
  const plotX = 30;
  const plotY = 15;
  const plotWidth = 410;
  const plotHeight = 110;

  const groupWidth = plotWidth / days.length;
  const barWidth = 14;

  return (
    <div className="bg-surface border border-border rounded-[6px] p-4 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-text truncate">{title}</h3>
        <span className="text-xs text-muted-text font-medium">
          Total: <strong className="text-text font-semibold">{total}</strong>
        </span>
      </div>

      {total === 0 ? (
        <p className="text-xs text-muted-text py-10 text-center">{emptyMessage}</p>
      ) : (
        <div className="w-full min-w-0 overflow-hidden">
          <svg
            role="img"
            aria-label={`${title}. Total: ${total}.`}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[220px]"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Base line */}
            <line
              x1={plotX}
              y1={plotY + plotHeight}
              x2={plotX + plotWidth}
              y2={plotY + plotHeight}
              stroke="var(--border)"
              strokeWidth="1"
            />

            {days.map((d, idx) => {
              const gx = plotX + idx * groupWidth;
              const barX = gx + (groupWidth - barWidth) / 2;
              const barH = (d.count / maxVal) * plotHeight;
              const barY = plotY + plotHeight - barH;
              const showLabel = idx % 2 === 0;

              return (
                <g key={d.dateStr}>
                  {d.count > 0 && (
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barH}
                      rx={2}
                      fill="var(--accent)"
                    />
                  )}
                  {showLabel && (
                    <text
                      x={gx + groupWidth / 2}
                      y={plotY + plotHeight + 16}
                      textAnchor="middle"
                      fontSize="9px"
                      fill="var(--muted-text)"
                      fontFamily="var(--font-sans), system-ui, sans-serif"
                      className="select-none"
                    >
                      {d.label}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  await connectToDatabase();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const { startUtc, days } = getUtcLast14Days();

  const [
    totalUsers,
    recentUsers,
    totalProjects,
    totalTasks,
    completedTasks,
    totalComments,
    tasksLast14Agg,
    usersLast14Agg,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    Project.countDocuments(),
    Task.countDocuments(),
    Task.countDocuments({ status: "done" }),
    Comment.countDocuments(),
    Task.aggregate([
      { $match: { createdAt: { $gte: startUtc } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    User.aggregate([
      { $match: { createdAt: { $gte: startUtc } } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" },
          },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const taskCountMap = new Map<string, number>();
  for (const item of tasksLast14Agg) {
    taskCountMap.set(item._id, item.count);
  }

  const userCountMap = new Map<string, number>();
  for (const item of usersLast14Agg) {
    userCountMap.set(item._id, item.count);
  }

  const tasksCreatedDays: DailyBucket[] = days.map((d) => ({
    dateStr: d.dateStr,
    label: d.label,
    count: taskCountMap.get(d.dateStr) || 0,
  }));

  const usersRegisteredDays: DailyBucket[] = days.map((d) => ({
    dateStr: d.dateStr,
    label: d.label,
    count: userCountMap.get(d.dateStr) || 0,
  }));

  return (
    <div className="space-y-6 min-w-0">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-text">Admin Overview</h1>
        <p className="text-xs text-muted-text mt-0.5">
          Global system counts and registration trends. Days are bucketed in UTC.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard label="Users (last 7d)" value={recentUsers} />
        <StatCard label="Total Projects" value={totalProjects} />
        <StatCard label="Total Tasks" value={totalTasks} />
        <StatCard label="Completed Tasks" value={completedTasks} />
        <StatCard label="Total Comments" value={totalComments} />
      </div>

      {/* Activity Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleBarChart
          title="Tasks created per day (last 14 days, UTC)"
          days={tasksCreatedDays}
          emptyMessage="No tasks created in the last 14 days."
        />
        <SimpleBarChart
          title="Users registered per day (last 14 days, UTC)"
          days={usersRegisteredDays}
          emptyMessage="No users registered in the last 14 days."
        />
      </div>
    </div>
  );
}
