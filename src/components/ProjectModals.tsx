"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, Button, TextField, useToast } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/types";

interface EditProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onProjectUpdated: (updatedProject: Project) => void;
}

export function EditProjectDialog({
  isOpen,
  onClose,
  project,
  onProjectUpdated,
}: EditProjectDialogProps) {
  const { showToast } = useToast();
  const [prevProject, setPrevProject] = useState(project);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [isSaving, setIsSaving] = useState(false);

  if (project !== prevProject) {
    setPrevProject(project);
    setName(project.name);
    setDescription(project.description || "");
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const res = await apiFetch<{ project: Project }>(`/api/projects/${project._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
        }),
      });

      onProjectUpdated(res.project);
      showToast("Project updated", "success");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update project";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <TextField
          label="Project Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={100}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full bg-surface border border-border rounded-[4px] p-2.5 text-xs text-text focus-visible:outline-accent resize-y"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || isSaving} isLoading={isSaving} size="sm">
            Save Changes
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

export function DeleteProjectDialog({ isOpen, onClose, project }: DeleteProjectDialogProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [confirmName, setConfirmName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setConfirmName("");
    }
  }

  const isConfirmed = confirmName.trim() === project.name;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await apiFetch(`/api/projects/${project._id}`, {
        method: "DELETE",
      });

      showToast("Project deleted", "success");
      router.push("/projects");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete project";
      showToast(msg, "error");
      setIsDeleting(false);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Delete Project">
      <form onSubmit={handleDelete} className="flex flex-col gap-4">
        <p className="text-xs text-text leading-relaxed">
          This action cannot be undone. All tasks and comments associated with{" "}
          <strong className="font-semibold text-text">{project.name}</strong> will be permanently deleted.
        </p>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text">
            Type <strong className="select-all font-semibold">{project.name}</strong> to confirm:
          </label>
          <TextField
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={project.name}
            className="text-xs py-1.5"
          />
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isConfirmed || isDeleting}
            isLoading={isDeleting}
            size="sm"
            className="bg-danger hover:bg-danger/90 text-white border-transparent"
          >
            Delete Project
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
