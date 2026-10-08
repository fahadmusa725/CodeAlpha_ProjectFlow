"use client";

import React, { useState, useEffect } from "react";
import { Dialog, Button, TextField, Spinner, useToast } from "@/components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faComment,
  faCalendarDays,
  faUser,
  faClock,
  faFlag,
  faTag,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import { LabelChip } from "@/components/TaskCard";
import { apiFetch } from "@/lib/api";
import type { Task, Comment, ProjectMember, TaskStatus, TaskPriority } from "@/types";

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  members: ProjectMember[];
  allLabels: string[];
  currentUserId?: string;
  isProjectOwner: boolean;
  onTaskUpdated: (updatedTask: Task) => void;
  onTaskDeleted: (taskId: string) => void;
  onCommentCountChanged: (taskId: string, delta: number) => void;
}

export function TaskDialog({
  isOpen,
  onClose,
  task,
  members,
  allLabels,
  currentUserId,
  isProjectOwner,
  onTaskUpdated,
  onTaskDeleted,
  onCommentCountChanged,
}: TaskDialogProps) {
  const { showToast } = useToast();

  const [prevTask, setPrevTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [dueDateStr, setDueDateStr] = useState<string>("");

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  if (task !== prevTask) {
    setPrevTask(task);
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setLabels(task.labels || []);
      setLabelInput("");
      setLabelError(null);
      const currentAssignee =
        typeof task.assignee === "object" && task.assignee ? task.assignee._id : "";
      setAssigneeId(currentAssignee);
      setDueDateStr(
        task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
      );
      setShowConfirmDelete(false);
      setNewCommentText("");
      setCommentError(null);
      setIsLoadingComments(true);
    }
  }

  useEffect(() => {
    if (!task) return;
    let ignore = false;
    apiFetch<{ comments: Comment[] }>(`/api/tasks/${task._id}/comments`)
      .then((res) => {
        if (!ignore) setComments(res.comments || []);
      })
      .catch((err: Error) => console.error("Failed to load comments", err))
      .finally(() => { if (!ignore) setIsLoadingComments(false); });
    return () => { ignore = true; };
  }, [task]);

  if (!task) return null;

  const initialAssigneeId =
    typeof task.assignee === "object" && task.assignee ? task.assignee._id : "";
  const initialDueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().split("T")[0]
    : "";

  const isChanged =
    title.trim() !== (task.title || "").trim() ||
    description.trim() !== (task.description || "").trim() ||
    status !== task.status ||
    priority !== (task.priority || "medium") ||
    JSON.stringify(labels) !== JSON.stringify(task.labels || []) ||
    assigneeId !== initialAssigneeId ||
    dueDateStr !== initialDueDate;

  const isTaskCreator =
    (typeof task.createdBy === "object" && task.createdBy
      ? task.createdBy._id
      : task.createdBy) === currentUserId;
  const canDelete = isProjectOwner || isTaskCreator;

  // Label editor helpers
  const addLabel = (raw: string) => {
    const val = raw.trim().replace(/,$/, "").trim();
    if (!val) return;
    if (val.length > 24) {
      setLabelError("Label must be at most 24 characters");
      return;
    }
    if (labels.some((l) => l.toLowerCase() === val.toLowerCase())) {
      setLabelError("Label already added");
      return;
    }
    if (labels.length >= 5) {
      setLabelError("At most 5 labels allowed");
      return;
    }
    setLabels((prev) => [...prev, val]);
    setLabelInput("");
    setLabelError(null);
  };

  const removeLabel = (idx: number) => {
    setLabels((prev) => prev.filter((_, i) => i !== idx));
    setLabelError(null);
  };

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLabel(labelInput);
    } else if (e.key === "Backspace" && labelInput === "" && labels.length > 0) {
      removeLabel(labels.length - 1);
    }
  };

  // Save
  const handleSaveChanges = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        labels,
        assignee: assigneeId || null,
        dueDate: dueDateStr ? new Date(dueDateStr + "T12:00:00Z").toISOString() : null,
      };
      const res = await apiFetch<{ task: Task }>(`/api/tasks/${task._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      onTaskUpdated(res.task);
      showToast("Task updated", "success");
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to update task", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDeleteTask = async () => {
    setIsDeleting(true);
    try {
      await apiFetch(`/api/tasks/${task._id}`, { method: "DELETE" });
      onTaskDeleted(task._id);
      showToast("Task deleted", "success");
      onClose();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Failed to delete task", "error");
      setIsDeleting(false);
    }
  };

  // Comment post
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newCommentText.trim();
    if (!text) return;
    if (text.length > 3000) {
      setCommentError("Comment cannot exceed 3000 characters");
      return;
    }
    setIsPostingComment(true);
    setCommentError(null);
    try {
      const res = await apiFetch<{ comment: Comment }>(`/api/tasks/${task._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      setComments((prev) => [...prev, res.comment]);
      setNewCommentText("");
      onCommentCountChanged(task._id, 1);
    } catch (err: unknown) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsPostingComment(false);
    }
  };

  // suggestions: labels used on board but not yet on this task
  const suggestionsId = `label-suggestions-${task._id}`;
  const suggestedLabels = allLabels.filter(
    (l) => !labels.some((existing) => existing.toLowerCase() === l.toLowerCase())
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      className="w-full max-w-2xl max-sm:h-full max-sm:max-h-full max-sm:rounded-none max-sm:m-0 m-auto"
    >
      <div className="flex flex-col gap-5 max-h-[80vh] overflow-y-auto pr-1 scrollbar-thin">
        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Title</label>
          <TextField
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            className="text-sm font-medium"
          />
        </div>

        {/* Status / Priority / Assignee / Due Date */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <FontAwesomeIcon icon={faClock} className="w-3 h-3 text-muted-text" />
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full bg-surface border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
            >
              <option value="todo">To do</option>
              <option value="in-progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <FontAwesomeIcon icon={faFlag} className="w-3 h-3 text-muted-text" />
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-surface border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <FontAwesomeIcon icon={faUser} className="w-3 h-3 text-muted-text" />
              Assignee
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full bg-surface border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCalendarDays} className="w-3 h-3 text-muted-text" />
              Due date
            </label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                className="w-full bg-surface border border-border rounded-[4px] px-2 py-1.5 text-xs text-text focus-visible:outline-accent"
              />
              {dueDateStr && (
                <button
                  type="button"
                  onClick={() => setDueDateStr("")}
                  className="text-xs text-muted-text hover:text-text px-1 py-1 rounded"
                  title="Clear"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Labels editor */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text flex items-center gap-1.5">
            <FontAwesomeIcon icon={faTag} className="w-3 h-3 text-muted-text" />
            Labels
            <span className="text-muted-text font-normal">(max 5, max 24 chars each)</span>
          </label>
          <div className="flex flex-wrap gap-1.5 p-2 bg-surface border border-border rounded-[4px] min-h-[36px]">
            {labels.map((label, i) => (
              <span key={label} className="inline-flex items-center gap-1">
                <LabelChip label={label} />
                <button
                  type="button"
                  onClick={() => removeLabel(i)}
                  className="text-muted-text hover:text-text p-0.5 rounded focus-visible:outline-accent"
                  aria-label={`Remove label ${label}`}
                >
                  <FontAwesomeIcon icon={faXmark} className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            {labels.length < 5 && (
              <>
                <input
                  list={suggestionsId}
                  value={labelInput}
                  onChange={(e) => { setLabelInput(e.target.value); setLabelError(null); }}
                  onKeyDown={handleLabelKeyDown}
                  placeholder={labels.length === 0 ? "Type and press Enter or comma..." : "Add label..."}
                  className="flex-1 min-w-[120px] text-xs bg-transparent border-none outline-none text-text placeholder:text-muted-text"
                />
                <datalist id={suggestionsId}>
                  {suggestedLabels.map((l) => (
                    <option key={l} value={l} />
                  ))}
                </datalist>
              </>
            )}
          </div>
          {labelError && (
            <p className="text-xs text-danger font-medium">{labelError}</p>
          )}
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Add details about this task..."
            className="w-full bg-surface border border-border rounded-[4px] p-3 text-xs text-text focus-visible:outline-accent resize-y"
          />
        </div>

        {/* Save / Delete Bar */}
        <div className="flex items-center justify-between border-t border-b border-border py-3">
          {canDelete ? (
            showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-danger font-medium">Delete this task?</span>
                <button
                  type="button"
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="text-xs bg-danger text-white px-2.5 py-1 rounded font-medium hover:opacity-90 disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  disabled={isDeleting}
                  className="text-xs text-muted-text hover:text-text px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="text-xs text-danger hover:underline flex items-center gap-1 font-medium"
              >
                <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
                Delete task
              </button>
            )
          ) : (
            <div />
          )}
          <Button
            onClick={handleSaveChanges}
            disabled={!isChanged || !title.trim() || isSaving}
            isLoading={isSaving}
            size="sm"
          >
            Save changes
          </Button>
        </div>

        {/* Comments */}
        <div className="flex flex-col gap-4">
          <h4 className="text-sm font-semibold text-text flex items-center gap-2">
            <FontAwesomeIcon icon={faComment} className="w-3.5 h-3.5 text-muted-text" />
            Comments ({comments.length})
          </h4>
          {isLoadingComments ? (
            <div className="py-4 flex justify-center"><Spinner size="sm" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-text italic">No comments yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {comments.map((c) => (
                <div key={c._id} className="bg-background/80 border border-border/70 rounded-[6px] p-3 text-xs flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar name={c.author?.name || "User"} userId={c.author?._id} size="sm" />
                      <span className="font-semibold text-text">{c.author?.name || "User"}</span>
                    </div>
                    <span className="text-[11px] text-muted-text">
                      {new Date(c.createdAt).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-text leading-relaxed pl-8">{c.text}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handlePostComment} className="flex flex-col gap-2 mt-2">
            <textarea
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              rows={2}
              maxLength={3000}
              placeholder="Write a comment..."
              disabled={isPostingComment}
              className="w-full bg-surface border border-border rounded-[4px] p-2.5 text-xs text-text focus-visible:outline-accent resize-y"
            />
            {commentError && <p className="text-xs text-danger font-medium">{commentError}</p>}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-text">{newCommentText.length}/3000</span>
              <Button
                type="submit"
                size="sm"
                variant="secondary"
                disabled={!newCommentText.trim() || isPostingComment}
                isLoading={isPostingComment}
              >
                Comment
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
