"use client";

import React, { useMemo } from "react";
import type { Project, Task } from "@/types";
import { isTaskOverdue } from "@/components/TaskCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { BarChart, type BarChartItem } from "@/components/dashboard/BarChart";
import { DailyChart, type DayStat } from "@/components/dashboard/DailyChart";

interface DashboardViewProps {
  project: Project;
  tasks: Task[];
}

function getLocalYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DashboardView({ project, tasks }: DashboardViewProps) {
  const totalTasks = tasks.length;

  const openCount = useMemo(
    () => tasks.filter((t) => t.status !== "done").length,
    [tasks]
  );
  const doneCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );
  const overdueCount = useMemo(
    () => tasks.filter((t) => isTaskOverdue(t)).length,
    [tasks]
  );
  const completionRate = useMemo(
    () => (totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0),
    [totalTasks, doneCount]
  );

  // Chart A: Tasks by Status
  const statusData = useMemo((): BarChartItem[] => {
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in-progress").length;
    const done = doneCount;

    return [
      {
        label: "To do",
        count: todo,
        subtext: totalTasks > 0 ? `${Math.round((todo / totalTasks) * 100)}%` : "0%",
      },
      {
        label: "In progress",
        count: inProgress,
        subtext: totalTasks > 0 ? `${Math.round((inProgress / totalTasks) * 100)}%` : "0%",
      },
      {
        label: "Done",
        count: done,
        subtext: totalTasks > 0 ? `${Math.round((done / totalTasks) * 100)}%` : "0%",
      },
    ];
  }, [tasks, doneCount, totalTasks]);

  // Chart B: Tasks by Assignee (Sorted count descending)
  const assigneeData = useMemo((): BarChartItem[] => {
    const map = new Map<string, { label: string; count: number }>();

    for (const m of project.members) {
      map.set(m.user._id, { label: m.user.name, count: 0 });
    }
    map.set("unassigned", { label: "Unassigned", count: 0 });

    for (const t of tasks) {
      if (!t.assignee) {
        map.get("unassigned")!.count += 1;
      } else {
        const aid = typeof t.assignee === "object" ? t.assignee._id : t.assignee;
        if (map.has(aid)) {
          map.get(aid)!.count += 1;
        } else {
          const name = typeof t.assignee === "object" ? t.assignee.name : "Assigned User";
          map.set(aid, { label: name, count: 1 });
        }
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .map((item) => ({ label: item.label, count: item.count }));
  }, [project.members, tasks]);

  // Chart C: Tasks by Priority
  const priorityData = useMemo((): BarChartItem[] => {
    const high = tasks.filter((t) => t.priority === "high").length;
    const medium = tasks.filter((t) => (t.priority || "medium") === "medium").length;
    const low = tasks.filter((t) => t.priority === "low").length;

    return [
      { label: "High", count: high },
      { label: "Medium", count: medium },
      { label: "Low", count: low },
    ];
  }, [tasks]);

  // Chart D: 14 Days Created vs Completed
  const dailyData = useMemo((): DayStat[] => {
    const today = new Date();
    const daysMap = new Map<string, DayStat>();
    const list: DayStat[] = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
      const dateStr = getLocalYMD(d);
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const stat: DayStat = { dateStr, label, created: 0, completed: 0 };
      daysMap.set(dateStr, stat);
      list.push(stat);
    }

    for (const task of tasks) {
      if (task.createdAt) {
        const cKey = getLocalYMD(new Date(task.createdAt));
        if (daysMap.has(cKey)) {
          daysMap.get(cKey)!.created += 1;
        }
      }

      if (task.status === "done") {
        const compDateStr = task.completedAt || task.updatedAt;
        if (compDateStr) {
          const compKey = getLocalYMD(new Date(compDateStr));
          if (daysMap.has(compKey)) {
            daysMap.get(compKey)!.completed += 1;
          }
        }
      }
    }

    return list;
  }, [tasks]);

  if (totalTasks === 0) {
    return (
      <div className="border border-border bg-surface rounded-[6px] p-12 text-center space-y-2">
        <p className="text-sm font-medium text-text">No tasks yet. Add tasks on the board to see statistics.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* Short muted line */}
      <p className="text-xs text-muted-text">
        Showing statistics across all {totalTasks} {totalTasks === 1 ? "task" : "tasks"} in this project.
      </p>

      {/* Stat Cards Grid (2 cols at 360px, up to 5 on wide) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total tasks" value={totalTasks} />
        <StatCard label="Open" value={openCount} />
        <StatCard label="Completed" value={doneCount} />
        <StatCard label="Overdue" value={overdueCount} />
        <StatCard
          label="Completion rate"
          value={`${completionRate}%`}
          progressBar={{
            value: completionRate,
            ariaLabel: "Completion rate",
          }}
        />
      </div>

      {/* Hand-written SVG Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BarChart title="Tasks by status" data={statusData} valueHeader="Count (%)" />
        <BarChart title="Tasks by assignee" data={assigneeData} valueHeader="Count" />
        <BarChart title="Tasks by priority" data={priorityData} valueHeader="Count" />
        <DailyChart days={dailyData} />
      </div>
    </div>
  );
}
