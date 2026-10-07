"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarDays } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  onOpenDialog?: (task: Task) => void;
  isOverlay?: boolean;
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
    const due = new Date(task.dueDate);
    return due < new Date();
  }, [task.dueDate, task.status]);

  const formattedDueDate = React.useMemo(() => {
    if (!task.dueDate) return null;
    const due = new Date(task.dueDate);
    return due.toLocaleDateString("en-US", {
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
      <h3 className="font-medium text-sm text-text line-clamp-2 leading-snug break-words">
        {task.title}
      </h3>

      {(formattedDueDate || assigneeName) && (
        <div className="mt-3 flex items-center justify-between gap-2 text-xs">
          {formattedDueDate ? (
            <div
              className={`flex items-center gap-1.5 font-medium ${
                isTaskOverdue ? "text-danger" : "text-muted-text"
              }`}
            >
              <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 flex-shrink-0" />
              <span>{formattedDueDate}</span>
              {isTaskOverdue && (
                <span className="bg-danger/10 text-danger text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Overdue
                </span>
              )}
            </div>
          ) : (
            <div />
          )}

          {assigneeName && (
            <Avatar name={assigneeName} userId={assigneeId} size="sm" />
          )}
        </div>
      )}
    </div>
  );
}
