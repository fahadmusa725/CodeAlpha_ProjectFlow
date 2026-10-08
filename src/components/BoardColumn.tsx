"use client";

import React, { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { TaskCard } from "@/components/TaskCard";
import { Button, TextField } from "@/components/ui";
import type { Task, TaskStatus } from "@/types";

interface BoardColumnProps {
  id: TaskStatus;
  title: string;
  tasks: Task[];
  onAddTask: (status: TaskStatus, title: string) => Promise<void>;
  onOpenDialog: (task: Task) => void;
  isDndDisabled?: boolean;
}

export function BoardColumn({ id, title, tasks, onAddTask, onOpenDialog }: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setIsAdding(false);
      setNewTitle("");
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddTask(id, trimmed);
      setNewTitle("");
      setIsAdding(false);
    } catch {
      // Error handled by caller / toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsAdding(false);
      setNewTitle("");
    }
  };

  const taskIds = tasks.map((t) => t._id);

  return (
    <div
      ref={setNodeRef}
      className="bg-[#ECEAE4] border border-border/80 rounded-[8px] p-3 flex flex-col h-full min-h-[500px] w-[85vw] sm:w-auto max-w-[350px] sm:max-w-none flex-shrink-0 snap-center"
    >
      <div className="flex items-center justify-between pb-3 px-1 mb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-text">{title}</span>
          <span className="bg-surface text-muted-text text-xs font-semibold px-2 py-0.5 rounded-full border border-border">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto py-1">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-text/80 italic border border-dashed border-border/70 rounded-[6px]">
              No tasks in {title.toLowerCase()}
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard key={task._id} task={task} onOpenDialog={onOpenDialog} />
            ))
          )}
        </SortableContext>
      </div>

      <div className="pt-2 mt-auto border-t border-border/60">
        {isAdding ? (
          <div className="flex flex-col gap-2 bg-surface p-2.5 rounded-[6px] border border-border shadow-sm">
            <TextField
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Task title..."
              autoFocus
              disabled={isSubmitting}
              className="text-xs py-1.5"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setNewTitle("");
                }}
                disabled={isSubmitting}
                className="text-xs px-2 py-1 text-muted-text hover:text-text rounded transition-colors"
              >
                Cancel
              </button>
              <Button
                size="sm"
                onClick={handleCreate}
                isLoading={isSubmitting}
                className="text-xs py-1 px-3"
              >
                Add
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full text-left flex items-center gap-2 text-xs font-medium text-muted-text hover:text-text hover:bg-surface/80 px-2.5 py-2 rounded-[6px] transition-colors focus-visible:outline-accent"
          >
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3 text-muted-text" />
            <span>Add task</span>
          </button>
        )}
      </div>
    </div>
  );
}
