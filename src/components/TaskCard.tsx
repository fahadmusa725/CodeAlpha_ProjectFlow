"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays, faFlag, faComment } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onOpenDialog?: (task: Task) => void;
  isOverlay?: boolean;
}

// Stable hash of label text -> index 0..7
export function getLabelColorIndex(label: string): number {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 8;
}

export function LabelChip({ label }: { label: string }) {
  const idx = getLabelColorIndex(label);
  return (
    <span
      className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] border border-black/[0.08] max-w-[80px] truncate leading-tight"
      style={{
        backgroundColor: `var(--label-${idx}-bg)`,
        color: `var(--label-${idx}-text)`,
      }}
      title={label}
    >
      {label}
    </span>
  );
}

export function TaskCard({ task, onOpenDialog, isOverlay = false }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isTaskOverdue = React.useMemo(() => {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(task.dueDate) < new Date();
  }, [task.dueDate, task.status]);

  const formattedDueDate = React.useMemo(() => {
    if (!task.dueDate) return null;
    return new Date(task.dueDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  }, [task.dueDate]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onOpenDialog?.(task);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    onOpenDialog?.(task);
  };

  const assigneeName = typeof task.assignee === "object" && task.assignee ? task.assignee.name : null;
  const assigneeId = typeof task.assignee === "object" && task.assignee ? task.assignee._id : undefined;

  const priority = task.priority || "medium";
  const labels = task.labels || [];
  const visibleLabels = labels.slice(0, 3);
  const hiddenCount = labels.length - visibleLabels.length;
  const commentCount = task.commentCount || 0;

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      {...(isOverlay ? {} : attributes)}
      {...(isOverlay ? {} : listeners)}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`bg-surface border border-border rounded-[6px] p-3 text-text cursor-grab active:cursor-grabbing select-none transition-colors hover:border-text/30 focus-visible:outline-accent ${
        isOverlay ? "shadow-md ring-1 ring-accent/30" : "shadow-none"
      }`}
    >
      {/* Labels row */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {visibleLabels.map((label) => (
            <LabelChip key={label} label={label} />
          ))}
          {hiddenCount > 0 && (
            <span className="inline-flex items-center text-[10px] font-semibold text-muted-text px-1.5 py-0.5 bg-background border border-border rounded-[3px]">
              +{hiddenCount}
            </span>
          )}
        </div>
      )}

      {/* Priority chip (high/low only) */}
      {priority !== "medium" && (
        <div className="mb-1.5">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[3px] border ${
              priority === "high"
                ? "bg-danger/10 text-danger border-danger/20"
                : "bg-muted-text/10 text-muted-text border-muted-text/20"
            }`}
          >
            <FontAwesomeIcon icon={faFlag} className="w-2.5 h-2.5" />
            {priority === "high" ? "High" : "Low"}
          </span>
        </div>
      )}

      {/* Title */}
      <h3 className="font-medium text-sm text-text line-clamp-2 leading-snug break-words">
        {task.title}
      </h3>

      {/* Footer */}
      {(formattedDueDate || commentCount > 0 || assigneeName) && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5">
            {formattedDueDate && (
              <div
                className={`flex items-center gap-1 font-medium ${
                  isTaskOverdue ? "text-danger" : "text-muted-text"
                }`}
              >
                <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 flex-shrink-0" />
                <span>{formattedDueDate}</span>
                {isTaskOverdue && (
                  <span className="bg-danger/10 text-danger text-[10px] font-semibold px-1 py-0.5 rounded">
                    Overdue
                  </span>
                )}
              </div>
            )}

            {commentCount > 0 && (
              <div className="flex items-center gap-1 text-muted-text font-medium">
                <FontAwesomeIcon icon={faComment} className="w-3 h-3" />
                <span>{commentCount}</span>
              </div>
            )}
          </div>

          {assigneeName && (
            <Avatar name={assigneeName} userId={assigneeId} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}
