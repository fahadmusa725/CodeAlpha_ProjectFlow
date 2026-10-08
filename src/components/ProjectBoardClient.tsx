"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { faArrowLeft, faExclamationTriangle, faRotateRight, faXmark } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "@/lib/api";
import { useUser } from "@/components/UserContext";
import { useToast, Button } from "@/components/ui";
import { ProjectHeader } from "@/components/ProjectHeader";
import { BoardColumn } from "@/components/BoardColumn";
import { TaskCard } from "@/components/TaskCard";
import { TaskDialog } from "@/components/TaskDialog";
import { FilterBar, type BoardFilters } from "@/components/FilterBar";
import type { Project, Task, TaskStatus } from "@/types";

interface ProjectBoardClientProps {
  projectId: string;
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "in-progress", title: "In progress" },
  { id: "done", title: "Done" },
];

const EMPTY_FILTERS: BoardFilters = {
  search: "",
  assigneeId: "",
  label: "",
  priority: "",
  overdue: false,
};

function isFiltersActive(f: BoardFilters) {
  return f.search !== "" || f.assigneeId !== "" || f.label !== "" || f.priority !== "" || f.overdue;
}

function applyFilters(tasks: Task[], f: BoardFilters): Task[] {
  return tasks.filter((t) => {
    if (f.search) {
      const q = f.search.toLowerCase();
      const inTitle = t.title.toLowerCase().includes(q);
      const inDesc = (t.description || "").toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    if (f.assigneeId === "unassigned") {
      if (t.assignee) return false;
    } else if (f.assigneeId) {
      const aid = typeof t.assignee === "object" && t.assignee ? t.assignee._id : null;
      if (aid !== f.assigneeId) return false;
    }
    if (f.label) {
      const labels = t.labels || [];
      if (!labels.some((l) => l.toLowerCase() === f.label.toLowerCase())) return false;
    }
    if (f.priority) {
      if ((t.priority || "medium") !== f.priority) return false;
    }
    if (f.overdue) {
      if (!t.dueDate || t.status === "done") return false;
      if (new Date(t.dueDate) >= new Date()) return false;
    }
    return true;
  });
}

export function ProjectBoardClient({ projectId }: ProjectBoardClientProps) {
  const { user } = useUser();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  // Filters from URL
  const filtersFromUrl = useMemo((): BoardFilters => ({
    search: searchParams.get("q") || "",
    assigneeId: searchParams.get("assignee") || "",
    label: searchParams.get("label") || "",
    priority: (searchParams.get("priority") || "") as BoardFilters["priority"],
    overdue: searchParams.get("overdue") === "1",
  }), [searchParams]);

  const [filters, setFilters] = useState<BoardFilters>(filtersFromUrl);

  // Sync URL when filters change
  const handleFiltersChange = useCallback((newFilters: BoardFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    if (newFilters.search) params.set("q", newFilters.search);
    if (newFilters.assigneeId) params.set("assignee", newFilters.assigneeId);
    if (newFilters.label) params.set("label", newFilters.label);
    if (newFilters.priority) params.set("priority", newFilters.priority);
    if (newFilters.overdue) params.set("overdue", "1");
    const qs = params.toString();
    router.replace(`/projects/${projectId}${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [projectId, router]);

  const handleClearFilters = useCallback(() => {
    handleFiltersChange(EMPTY_FILTERS);
  }, [handleFiltersChange]);

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Fetch Project & Tasks
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
        if (!ignore) setIsLoading(false);
      }
    }

    load();
    return () => { ignore = true; };
  }, [projectId]);

  const refetchTasks = useCallback(async () => {
    try {
      const tasksRes = await apiFetch<{ tasks: Task[] }>(`/api/projects/${projectId}/tasks`);
      setTasks(sortTasks(tasksRes.tasks || []));
    } catch (err) {
      console.error("Failed to refetch tasks", err);
    }
  }, [projectId]);

  // Collect all labels on the board for datalist suggestions
  const allLabels = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      for (const l of t.labels || []) set.add(l);
    }
    return Array.from(set).sort();
  }, [tasks]);

  // Grouped & sorted tasks
  const columnsTasks = useMemo(() => {
    const todo = sortTasks(tasks.filter((t) => t.status === "todo"));
    const inProgress = sortTasks(tasks.filter((t) => t.status === "in-progress"));
    const done = sortTasks(tasks.filter((t) => t.status === "done"));
    return { "todo": todo, "in-progress": inProgress, "done": done };
  }, [tasks]);

  const filtersActive = isFiltersActive(filters);

  // Filtered view per column
  const filteredColumnsTasks = useMemo(() => {
    return {
      "todo": filtersActive ? applyFilters(columnsTasks["todo"], filters) : columnsTasks["todo"],
      "in-progress": filtersActive ? applyFilters(columnsTasks["in-progress"], filters) : columnsTasks["in-progress"],
      "done": filtersActive ? applyFilters(columnsTasks["done"], filters) : columnsTasks["done"],
    };
  }, [columnsTasks, filters, filtersActive]);

  const visibleCount = useMemo(() =>
    Object.values(filteredColumnsTasks).reduce((sum, arr) => sum + arr.length, 0),
    [filteredColumnsTasks]
  );

  const activeTask = useMemo(
    () => tasks.find((t) => t._id === activeId) || null,
    [tasks, activeId]
  );

  // Quick Add Task
  const handleAddTask = async (status: TaskStatus, title: string) => {
    const tempId = "temp-" + Date.now();
    const colTasks = columnsTasks[status];
    const order = colTasks.length > 0 ? colTasks[colTasks.length - 1].order + 1 : 1;

    const tempTask: Task = {
      _id: tempId,
      project: projectId,
      title,
      description: "",
      status,
      priority: "medium",
      labels: [],
      commentCount: 0,
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
      showToast(err instanceof Error ? err.message : "Failed to create task", "error");
      throw err;
    }
  };

  // Drag handlers (only when no filters active)
  const handleDragStart = (event: DragStartEvent) => {
    if (!filtersActive) setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (filtersActive) return;
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
      if (overTask) targetStatus = overTask.status;
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
    if (filtersActive || !over) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;
    const draggedTask = tasks.find((t) => t._id === activeIdStr);
    if (!draggedTask) return;

    let targetStatus: TaskStatus = draggedTask.status;
    if (COLUMNS.some((col) => col.id === overIdStr)) {
      targetStatus = overIdStr as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t._id === overIdStr);
      if (overTask) targetStatus = overTask.status;
    }

    const columnTasks = sortTasks(
      tasks.filter((t) => t.status === targetStatus && t._id !== activeIdStr)
    );

    let targetIndex = columnTasks.length;
    if (!COLUMNS.some((col) => col.id === overIdStr)) {
      const overIndex = columnTasks.findIndex((t) => t._id === overIdStr);
      if (overIndex !== -1) targetIndex = overIndex;
    }

    let newOrder: number;
    if (columnTasks.length === 0) {
      newOrder = 1;
    } else if (targetIndex === 0) {
      newOrder = columnTasks[0].order - 1;
    } else if (targetIndex >= columnTasks.length) {
      newOrder = columnTasks[columnTasks.length - 1].order + 1;
    } else {
      newOrder = (columnTasks[targetIndex - 1].order + columnTasks[targetIndex].order) / 2;
    }

    if (draggedTask.status === targetStatus && draggedTask.order === newOrder) return;

    let requiresRenumbering = false;
    if (targetIndex > 0 && Math.abs(newOrder - columnTasks[targetIndex - 1].order) < 1e-6)
      requiresRenumbering = true;
    if (targetIndex < columnTasks.length && Math.abs(newOrder - columnTasks[targetIndex].order) < 1e-6)
      requiresRenumbering = true;

    const previousTasks = [...tasks];

    if (requiresRenumbering) {
      const newColumnList = [...columnTasks];
      newColumnList.splice(targetIndex, 0, { ...draggedTask, status: targetStatus });
      const updatedTasksMap = new Map<string, number>();
      newColumnList.forEach((task, idx) => updatedTasksMap.set(task._id, idx + 1));

      setTasks((prev) =>
        sortTasks(
          prev.map((t) => {
            if (updatedTasksMap.has(t._id)) {
              return { ...t, status: targetStatus, order: updatedTasksMap.get(t._id)! };
            }
            return t;
          })
        )
      );

      try {
        for (const t of newColumnList) {
          await apiFetch(`/api/tasks/${t._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus, order: updatedTasksMap.get(t._id)! }),
          });
        }
      } catch (err: unknown) {
        setTasks(previousTasks);
        showToast(err instanceof Error ? err.message : "Failed to reorder tasks", "error");
      }
    } else {
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
        showToast(err instanceof Error ? err.message : "Failed to move task", "error");
      }
    }
  };

  const handleOpenTaskDialog = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleCommentCountChanged = useCallback((taskId: string, delta: number) => {
    setTasks((prev) =>
      prev.map((t) =>
        t._id === taskId ? { ...t, commentCount: (t.commentCount || 0) + delta } : t
      )
    );
    if (selectedTask && selectedTask._id === taskId) {
      setSelectedTask((prev) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + delta } : prev);
    }
  }, [selectedTask]);

  // Render loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-surface border border-border rounded-[8px] animate-pulse" />
        <div className="h-12 bg-surface border border-border rounded-[8px] animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#ECEAE4]/60 border border-border/80 rounded-[8px] p-4 h-[500px] flex flex-col gap-3 animate-pulse">
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
        <Link href="/projects" className="inline-flex items-center text-xs font-medium text-muted-text hover:text-text transition-colors">
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
            <Link href="/projects" className="inline-flex items-center justify-center font-medium text-xs rounded-[4px] px-3.5 py-1.5 bg-accent text-white hover:bg-accent-hover transition-colors">
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
    <div className="space-y-4">
      <ProjectHeader
        project={project}
        currentUserId={user?.id}
        onProjectUpdated={(updated) => setProject(updated)}
        onMemberRemoved={refetchTasks}
      />

      <FilterBar
        filters={filters}
        onChange={handleFiltersChange}
        members={project.members}
        allLabels={allLabels}
        visibleCount={visibleCount}
        totalCount={tasks.length}
        filtersActive={filtersActive}
        onClear={handleClearFilters}
      />

      {filtersActive && (
        <p className="text-xs text-muted-text text-center py-0.5">
          Drag and drop is disabled while filters are active. Clear filters to reorder cards.
        </p>
      )}

      <DndContext
        id="project-board-dnd"
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="snap-x snap-mandatory flex overflow-x-auto gap-4 md:grid md:grid-cols-3 pb-4 scrollbar-thin">
          {COLUMNS.map((column) => {
            const colTasks = filteredColumnsTasks[column.id];
            return (
              <BoardColumn
                key={column.id}
                id={column.id}
                title={column.title}
                tasks={colTasks}
                onAddTask={handleAddTask}
                onOpenDialog={handleOpenTaskDialog}
                isDndDisabled={filtersActive}
              />
            );
          })}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {filtersActive && visibleCount === 0 && (
        <div className="border border-dashed border-border rounded-[8px] py-12 text-center space-y-3">
          <p className="text-sm font-semibold text-text">No tasks match the current filters</p>
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            Clear filters
          </button>
        </div>
      )}

      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        members={project.members}
        allLabels={allLabels}
        currentUserId={user?.id}
        isProjectOwner={project.owner === user?.id}
        onTaskUpdated={(updated) => {
          setTasks((prev) => sortTasks(prev.map((t) => (t._id === updated._id ? updated : t))));
        }}
        onTaskDeleted={(deletedId) => {
          setTasks((prev) => prev.filter((t) => t._id !== deletedId));
        }}
        onCommentCountChanged={handleCommentCountChanged}
      />
    </div>
  );
}
