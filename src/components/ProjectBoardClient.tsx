"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faExclamationTriangle, faRotateRight } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/components/UserContext";
import { useToast, Button } from "@/components/ui";
import { ProjectHeader } from "@/components/ProjectHeader";
import { BoardColumn } from "@/components/BoardColumn";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import type { Project, Task, TaskStatus } from "@/types";

interface ProjectBoardClientProps {
  projectId: string;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "in-progress", title: "In progress" },
  { id: "done", title: "Done" },
];

export function ProjectBoardClient({ projectId }: ProjectBoardClientProps) {
  const { user } = useUser();
  const { showToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // DND Sensors
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const keyboardSensor = useSensor(KeyboardSensor, {
    coordinateGetter: sortableKeyboardCoordinates,
  });
  const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setIsNotFound(false);

      try {
        const [projRes, tasksRes] = await Promise.all([
          apiFetch<{ project: Project }>(`/api/projects/${projectId}`),
          apiFetch<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`),
        ]);

        if (!ignore) {
          setProject(projRes.project);
          setTasks(sortTasks(tasksRes.tasks || []));
        }
      } catch (err: unknown) {
        if (!ignore) {
          if (
            err instanceof Error &&
            (err.message.includes("404") || err.message.toLowerCase().includes("not found"))
          ) {
            setIsNotFound(true);
          } else {
            setError(err instanceof Error ? err.message : "Failed to load project details");
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  const refetchTasks = useCallback(async () => {
    try {
      const tasksRes = await apiFetch<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`);
      setTasks(sortTasks(tasksRes.tasks || []));
    } catch (err) {
      console.error("Failed to refetch tasks", err);
    }
  }, [projectId]);

  // Grouped & sorted tasks
  const columnsTasks = useMemo(() => {
    const todo = sortTasks(tasks.filter((t) => t.status === "todo"));
    const inProgress = sortTasks(tasks.filter((t) => t.status === "in-progress"));
    const done = sortTasks(tasks.filter((t) => t.status === "done"));

    return {
      todo,
      "in-progress": inProgress,
      done,
    };
  }, [tasks]);

  const activeTask = useMemo(() => {
    return tasks.find((t) => t._id === activeId) || null;
  }, [tasks, activeId]);

  // Quick Add Task
  const handleAddTask = async (status: TaskStatus, title: string) => {
    const tempId = "temp-" + Date.now();
    const columnTasks = columnsTasks[status];
    const maxOrder = columnTasks.length > 0 ? columnTasks[columnTasks.length - 1].order : 0;
    const order = maxOrder + 1;

    const tempTask: Task = {
      _id: tempId,
      project: projectId,
      title,
      description: "",
      status,
      order,
      createdBy: user ? { _id: user.id, name: user.name, email: user.email } : "me",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setTasks((prev) => sortTasks([...prev, tempTask]));

    try {
      const res = await apiFetch<{ task: Task }>(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, status }),
      });

      setTasks((prev) => sortTasks(prev.map((t) => (t._id === tempId ? res.task : t))));
    } catch (err: unknown) {
      setTasks((prev) => prev.filter((t) => t._id !== tempId));
      const msg = err instanceof Error ? err.message : "Failed to create task";
      showToast(msg, "error");
      throw err;
    }
  };

  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const currentTask = tasks.find((t) => t._id === activeIdStr);
    if (!currentTask) return;

    let targetStatus: TaskStatus | null = null;

    if (COLUMNS.some((col) => col.id === overIdStr)) {
      targetStatus = overIdStr as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t._id === overIdStr);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    if (targetStatus && currentTask.status !== targetStatus) {
      setTasks((prev) =>
        prev.map((t) => (t._id === activeIdStr ? { ...t, status: targetStatus! } : t))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    const draggedTask = tasks.find((t) => t._id === activeIdStr);
    if (!draggedTask) return;

    let targetStatus: TaskStatus = draggedTask.status;
    if (COLUMNS.some((col) => col.id === overIdStr)) {
      targetStatus = overIdStr as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t._id === overIdStr);
      if (overTask) {
        targetStatus = overTask.status;
      }
    }

    const columnTasks = sortTasks(
      tasks.filter((t) => t.status === targetStatus && t._id !== activeIdStr)
    );

    let targetIndex = columnTasks.length;
    if (!COLUMNS.some((col) => col.id === overIdStr)) {
      const overIndex = columnTasks.findIndex((t) => t._id === overIdStr);
      if (overIndex !== -1) {
        targetIndex = overIndex;
      }
    }

    let newOrder = 1;
    if (columnTasks.length === 0) {
      newOrder = 1;
    } else if (targetIndex === 0) {
      newOrder = columnTasks[0].order - 1;
    } else if (targetIndex >= columnTasks.length) {
      newOrder = columnTasks[columnTasks.length - 1].order + 1;
    } else {
      const prevOrder = columnTasks[targetIndex - 1].order;
      const nextOrder = columnTasks[targetIndex].order;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    // Check if position didn't actually change
    if (draggedTask.status === targetStatus && draggedTask.order === newOrder) {
      return;
    }

    // Precision Guard Check: if within 1e-6 of neighbor, renumber column
    let requiresRenumbering = false;
    if (targetIndex > 0 && Math.abs(newOrder - columnTasks[targetIndex - 1].order) < 1e-6) {
      requiresRenumbering = true;
    }
    if (targetIndex < columnTasks.length && Math.abs(newOrder - columnTasks[targetIndex].order) < 1e-6) {
      requiresRenumbering = true;
    }

    const previousTasks = [...tasks];

    if (requiresRenumbering) {
      // Renumber column tasks sequentially 1..n
      const newColumnList = [...columnTasks];
      newColumnList.splice(targetIndex, 0, { ...draggedTask, status: targetStatus });

      const updatedTasksMap = new Map<string, number>();
      newColumnList.forEach((task, idx) => {
        updatedTasksMap.set(task._id, idx + 1);
      });

      // Optimistic state
      setTasks((prev) =>
        sortTasks(
          prev.map((t) => {
            if (updatedTasksMap.has(t._id)) {
              return {
                ...t,
                status: targetStatus,
                order: updatedTasksMap.get(t._id)!,
              };
            }
            return t;
          })
        )
      );

      // Perform sequential PATCH updates for the whole column
      try {
        for (const t of newColumnList) {
          const orderVal = updatedTasksMap.get(t._id)!;
          await apiFetch(`/api/tasks/${t._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus, order: orderVal }),
          });
        }
      } catch (err: unknown) {
        setTasks(previousTasks);
        const msg = err instanceof Error ? err.message : "Failed to reorder tasks";
        showToast(msg, "error");
      }
    } else {
      // Single task patch
      setTasks((prev) =>
        sortTasks(
          prev.map((t) => (t._id === activeIdStr ? { ...t, status: targetStatus, order: newOrder } : t))
        )
      );

      try {
        await apiFetch(`/api/tasks/${activeIdStr}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus, order: newOrder }),
        });
      } catch (err: unknown) {
        setTasks(previousTasks);
        const msg = err instanceof Error ? err.message : "Failed to move task";
        showToast(msg, "error");
      }
    }
  };

  // Open Task Dialog
  const handleOpenTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  // Render states
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-surface border border-border rounded-[8px] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#ECEAE4]/60 border border-border/80 rounded-[8px] p-4 h-[500px] flex flex-col gap-3 animate-pulse"
            >
              <div className="h-6 bg-border/60 rounded w-1/3" />
              <div className="h-20 bg-surface/80 rounded-[6px]" />
              <div className="h-20 bg-surface/80 rounded-[6px]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isNotFound || !project) {
    return (
      <div className="space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center text-xs font-medium text-muted-text hover:text-text transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 mr-1.5" />
          Back to Projects
        </Link>

        <div className="border border-border bg-surface rounded-[6px] p-12 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mx-auto">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-text">Project not found</h1>
            <p className="text-xs text-muted-text mt-1 max-w-sm mx-auto">
              The project you are looking for does not exist or you do not have permission to view it.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/projects"
              className="inline-flex items-center justify-center font-medium text-xs rounded-[4px] px-3.5 py-1.5 bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Return to Projects List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-border bg-surface rounded-[6px] p-10 text-center space-y-3">
        <div className="w-10 h-10 rounded-full bg-danger/10 text-danger border border-danger/20 flex items-center justify-center mx-auto">
          <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4" />
        </div>
        <p className="text-xs font-medium text-danger">{error}</p>
        <Button size="sm" onClick={() => window.location.reload()} className="text-xs py-1.5 px-4">
          <FontAwesomeIcon icon={faRotateRight} className="w-3 h-3 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectHeader
        project={project}
        currentUserId={user?.id}
        onProjectUpdated={(updated) => setProject(updated)}
        onMemberRemoved={refetchTasks}
      />

      <DndContext
        id="project-board-dnd"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="snap-x snap-mandatory flex overflow-x-auto gap-4 md:grid md:grid-cols-3 pb-4 scrollbar-thin">
          {COLUMNS.map((column) => (
            <BoardColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={columnsTasks[column.id]}
              onAddTask={handleAddTask}
              onOpenDialog={handleOpenTaskDialog}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        members={project.members}
        currentUserId={user?.id}
        isProjectOwner={project.owner === user?.id}
        onTaskUpdated={(updated) => {
          setTasks((prev) => sortTasks(prev.map((t) => (t._id === updated._id ? updated : t))));
        }}
        onTaskDeleted={(deletedId) => {
          setTasks((prev) => prev.filter((t) => t._id !== deletedId));
        }}
      />
    </div>
  );
}
