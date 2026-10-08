"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faFolderOpen,
  faRotateRight,
  faCalendar,
} from "@fortawesome/free-solid-svg-icons";
import { Button, TextField, Dialog, Spinner } from "@/components/ui";
import { Avatar } from "@/components/Avatar";
import { apiFetch, ApiError } from "@/lib/api";
import type { ProjectsListResponse, ProjectDetailResponse, Project } from "@/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ProjectsListResponse>("/api/projects");
      setProjects(data.projects);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load projects. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    apiFetch<ProjectsListResponse>("/api/projects")
      .then((data) => {
        if (!ignore) {
          setProjects(data.projects);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError("Failed to load projects. Please try again.");
          }
          setIsLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenDialog = () => {
    setNewProjectName("");
    setNewProjectDesc("");
    setCreateError(null);
    setNameError(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isCreating) {
      setIsDialogOpen(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setNameError(null);

    const trimmedName = newProjectName.trim();
    if (!trimmedName) {
      setNameError("Project name is required");
      return;
    }
    if (trimmedName.length > 100) {
      setNameError("Project name must be 100 characters or less");
      return;
    }
    if (newProjectDesc.length > 500) {
      setCreateError("Description must be 500 characters or less");
      return;
    }

    setIsCreating(true);
    try {
      const res = await apiFetch<ProjectDetailResponse>("/api/projects", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: newProjectDesc.trim() || undefined,
        }),
      });

      setProjects((prev) => [res.project, ...prev]);
      setIsDialogOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.message);
      } else {
        setCreateError("Failed to create project. Please try again.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const getUserRole = (project: Project) => {
    const member = project.members.find(
      (m) => typeof m.user === "object" && m.user !== null
    );
    return member?.role || "member";
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">Projects</h1>
          <p className="text-xs text-muted-text mt-0.5">
            Manage your workspace projects and team collaborations
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <FontAwesomeIcon icon={faPlus} className="w-3.5 h-3.5 mr-1.5" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-text">
          <Spinner size="lg" />
          <p className="text-xs">Loading projects...</p>
        </div>
      ) : error ? (
        <div className="border border-danger/20 bg-danger/5 rounded-[6px] p-6 text-center space-y-3">
          <p className="text-sm font-medium text-danger">{error}</p>
          <Button variant="secondary" onClick={fetchProjects} className="text-xs">
            <FontAwesomeIcon icon={faRotateRight} className="w-3 h-3 mr-1.5" />
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="border border-dashed border-border rounded-[6px] p-12 text-center space-y-3 bg-surface">
          <div className="w-10 h-10 rounded-full bg-background border border-border flex items-center justify-center mx-auto text-muted-text">
            <FontAwesomeIcon icon={faFolderOpen} className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">No projects yet</h3>
            <p className="text-xs text-muted-text mt-1 max-w-sm mx-auto">
              Get started by creating your first project to organize tasks and work with your team.
            </p>
          </div>
          <Button onClick={handleOpenDialog} className="mt-2 text-xs">
            <FontAwesomeIcon icon={faPlus} className="w-3 h-3 mr-1.5" />
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => {
            const role = getUserRole(project);
            const taskCount = project.taskCount ?? 0;
            const doneCount = project.doneCount ?? 0;
            const progressPct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
            const visibleMembers = project.members.slice(0, 4);
            const extraCount = project.members.length - visibleMembers.length;

            return (
              <Link
                key={project._id}
                href={`/projects/${project._id}`}
                className="group border border-border rounded-[6px] bg-surface p-4 flex flex-col gap-3 hover:border-accent/50 transition-colors focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-base text-text group-hover:text-accent transition-colors line-clamp-1">
                      {project.name}
                    </h2>
                    <span
                      className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-[4px] border flex-shrink-0 ${
                        role === "owner"
                          ? "bg-accent/10 border-accent/20 text-accent"
                          : "bg-background border-border text-muted-text"
                      }`}
                    >
                      {role}
                    </span>
                  </div>
                  {project.description ? (
                    <p className="text-xs text-muted-text line-clamp-2">{project.description}</p>
                  ) : (
                    <p className="text-xs text-muted-text italic">No description provided</p>
                  )}
                </div>

                {/* Task progress */}
                <div className="flex flex-col gap-1.5">
                  {taskCount === 0 ? (
                    <p className="text-xs text-muted-text italic">No tasks yet</p>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-text">
                          {doneCount} of {taskCount} tasks done
                        </span>
                        <span className="text-xs font-medium text-text">{progressPct}%</span>
                      </div>
                      <div
                        role="progressbar"
                        aria-valuenow={progressPct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${doneCount} of ${taskCount} tasks done`}
                        className="h-1.5 bg-border rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-accent rounded-full transition-all"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Footer: date + member avatars */}
                <div className="flex items-center justify-between text-xs text-muted-text border-t border-border pt-2">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCalendar} className="w-3 h-3" />
                    {formatDate(project.createdAt)}
                  </span>
                  <div className="flex items-center -space-x-1.5">
                    {visibleMembers.map((m) => (
                      <Avatar
                        key={m.user._id}
                        name={m.user.name}
                        userId={m.user._id}
                        size="sm"
                        className="ring-2 ring-surface"
                      />
                    ))}
                    {extraCount > 0 && (
                      <div className="w-6 h-6 rounded-full bg-background border border-border text-[10px] font-semibold text-muted-text flex items-center justify-center ring-2 ring-surface">
                        +{extraCount}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        title="Create New Project"
      >
        <form onSubmit={handleCreateProject} className="flex flex-col gap-4">
          {createError && (
            <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
              {createError}
            </div>
          )}

          <TextField
            id="projectName"
            label="Project Name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            error={nameError || undefined}
            placeholder="e.g. Website Redesign"
            required
            maxLength={100}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="projectDesc" className="text-xs font-semibold text-text">
              Description (optional)
            </label>
            <textarea
              id="projectDesc"
              rows={3}
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Briefly describe the purpose of this project..."
              maxLength={500}
              className="w-full px-3 py-1.5 text-sm bg-white border border-border rounded-[4px] text-text placeholder:text-muted-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <span className="text-[10px] text-muted-text text-right">
              {newProjectDesc.length}/500
            </span>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-3 mt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={handleCloseDialog}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Project
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
