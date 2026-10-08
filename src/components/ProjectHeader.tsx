"use client";

import React, { useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faPenToSquare, faTrash, faUsers } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import { MembersDialog } from "@/components/MembersDialog";
import { EditProjectDialog, DeleteProjectDialog } from "@/components/ProjectModals";
import type { Project } from "@/types";

interface PresenceUser {
  clientId: string;
  name: string;
  isCurrentUser: boolean;
}

interface ProjectHeaderProps {
  project: Project;
  currentUserId?: string;
  onProjectUpdated: (updatedProject: Project) => void;
  onMemberRemoved: () => void;
  connectionState?: string;
  presenceUsers?: PresenceUser[];
}

export function ProjectHeader({
  project,
  currentUserId,
  onProjectUpdated,
  onMemberRemoved,
  connectionState,
  presenceUsers = [],
}: ProjectHeaderProps) {
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const isOwner = project.owner === currentUserId;
  const maxVisibleAvatars = 4;
  const visibleMembers = project.members.slice(0, maxVisibleAvatars);
  const remainingCount = project.members.length - maxVisibleAvatars;

  const showRealtimeIndicator = connectionState && connectionState !== "off";
  const isLive = connectionState === "connected" || connectionState === "attached";

  const visiblePresence = presenceUsers.slice(0, 4);
  const remainingPresence = presenceUsers.length - 4;

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Top row: back link & owner actions – wrap on narrow screens */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-text transition-colors"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3" />
          Back to Projects
        </Link>

        {isOwner && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-text bg-surface border border-border px-2.5 min-h-[40px] sm:min-h-0 sm:py-1 rounded-[4px] transition-colors focus-visible:outline-accent"
              aria-label="Edit project details"
              title="Edit project details"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-3 h-3" />
              <span className="hidden sm:inline">Edit</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-danger hover:bg-danger/10 border border-danger/20 px-2.5 min-h-[40px] sm:min-h-0 sm:py-1 rounded-[4px] transition-colors focus-visible:outline-accent"
              aria-label="Delete project"
              title="Delete project"
            >
              <FontAwesomeIcon icon={faTrash} className="w-3 h-3" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Main header content */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface border border-border rounded-[8px] p-5">
        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-xl font-bold text-text tracking-tight break-words">{project.name}</h1>
          {project.description && (
            <p className="text-xs text-muted-text leading-relaxed break-words">{project.description}</p>
          )}
        </div>

        {/* Member avatar stack & Presence / Connection indicator */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Connection Indicator */}
          {showRealtimeIndicator && (
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${
                isLive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
              aria-label={`Realtime status: ${isLive ? "Live" : "Reconnecting"}`}
              title={`Realtime status: ${isLive ? "Live" : "Reconnecting"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
                }`}
              />
              <span>{isLive ? "Live" : "Reconnecting"}</span>
            </div>
          )}

          {/* Online Presence Avatars */}
          {visiblePresence.length > 0 && (
            <div className="flex items-center gap-1 border-r border-border pr-3">
              <span className="text-[11px] text-muted-text font-medium mr-1 hidden sm:inline">Online:</span>
              <div className="flex items-center -space-x-1.5 overflow-visible py-0.5">
                {visiblePresence.map((pUser) => (
                  <div key={pUser.clientId} title={pUser.isCurrentUser ? `${pUser.name} (You)` : pUser.name}>
                    <Avatar
                      name={pUser.name}
                      userId={pUser.clientId}
                      size="sm"
                      className="ring-2 ring-emerald-500 transition-transform hover:scale-110"
                    />
                  </div>
                ))}
                {remainingPresence > 0 && (
                  <div
                    className="w-6 h-6 rounded-full bg-background border border-border text-[10px] font-semibold text-muted-text flex items-center justify-center ring-2 ring-surface"
                    title={`${remainingPresence} more online`}
                  >
                    +{remainingPresence}
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsMembersOpen(true)}
            className="flex items-center gap-2 group cursor-pointer focus-visible:outline-accent rounded-full p-0.5 min-h-[40px] sm:min-h-0"
            aria-label="View and manage members"
            title="View & manage members"
          >
            <div className="flex items-center -space-x-1.5 overflow-visible py-1 px-1">
              {visibleMembers.map((member) => (
                <Avatar
                  key={member.user._id}
                  name={member.user.name}
                  userId={member.user._id}
                  size="md"
                  className="ring-[3px] ring-surface transition-transform group-hover:scale-105"
                />
              ))}
              {remainingCount > 0 && (
                <div className="w-7 h-7 rounded-full bg-background border border-border text-[11px] font-semibold text-muted-text flex items-center justify-center ring-[3px] ring-surface">
                  +{remainingCount}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-text group-hover:text-text font-medium border border-border rounded-[4px] px-2 py-1 bg-background/50">
              <FontAwesomeIcon icon={faUsers} className="w-3 h-3" />
              <span>Members</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dialogs */}
      <MembersDialog
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        project={project}
        isOwner={isOwner}
        onProjectUpdated={onProjectUpdated}
        onMemberRemoved={onMemberRemoved}
      />

      {isOwner && (
        <>
          <EditProjectDialog
            isOpen={isEditOpen}
            onClose={() => setIsEditOpen(false)}
            project={project}
            onProjectUpdated={onProjectUpdated}
          />
          <DeleteProjectDialog
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            project={project}
          />
        </>
      )}
    </div>
  );
}
