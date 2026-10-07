"use client";

import React, { useState } from "react";
import { Dialog, Button, TextField } from "@/components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faUserMinus } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import { apiFetch } from "@/lib/api";
import type { Project } from "@/types";

interface MembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  isOwner: boolean;
  onProjectUpdated: (updatedProject: Project) => void;
  onMemberRemoved: () => void;
}

export function MembersDialog({
  isOpen,
  onClose,
  project,
  isOwner,
  onProjectUpdated,
  onMemberRemoved,
}: MembersDialogProps) {
  const [emailToAdd, setEmailToAdd] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmRemovingUserId, setConfirmRemovingUserId] = useState<string | null>(null);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailToAdd.trim().toLowerCase();
    if (!email) return;

    setIsAdding(true);
    setAddError(null);

    try {
      const res = await apiFetch<{ project: Project }>(`/api/projects/${project._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      onProjectUpdated(res.project);
      setEmailToAdd("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes("404") || err.message.toLowerCase().includes("not found")) {
          setAddError("User not found with this email");
        } else if (err.message.includes("409") || err.message.toLowerCase().includes("already")) {
          setAddError("User is already a project member");
        } else {
          setAddError(err.message);
        }
      } else {
        setAddError("Failed to add member");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await apiFetch(`/api/projects/${project._id}/members/${userId}`, {
        method: "DELETE",
      });

      const updatedMembers = project.members.filter((m) => m.user._id !== userId);
      onProjectUpdated({ ...project, members: updatedMembers });
      onMemberRemoved();
      setConfirmRemovingUserId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove member";
      setAddError(msg);
    } finally {
      setRemovingUserId(null);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Project Members">
      <div className="flex flex-col gap-5 max-h-[70vh] overflow-y-auto pr-1">
        {/* Add Member Form (Owner Only) */}
        {isOwner && (
          <form onSubmit={handleAddMember} className="flex flex-col gap-2 pb-4 border-b border-border">
            <label className="text-xs font-semibold text-text">Add Member by Email</label>
            <div className="flex items-center gap-2">
              <TextField
                type="email"
                value={emailToAdd}
                onChange={(e) => {
                  setEmailToAdd(e.target.value);
                  setAddError(null);
                }}
                placeholder="colleague@example.com"
                disabled={isAdding}
                className="text-xs py-1.5"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!emailToAdd.trim() || isAdding}
                isLoading={isAdding}
                className="text-xs whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faUserPlus} className="w-3 h-3 mr-1.5" />
                Add
              </Button>
            </div>
            {addError && <p className="text-xs text-danger font-medium">{addError}</p>}
          </form>
        )}

        {/* Member List */}
        <div className="flex flex-col gap-2.5">
          <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider">
            Members ({project.members.length})
          </h4>
          <div className="flex flex-col gap-2">
            {project.members.map((member) => (
              <div
                key={member.user._id}
                className="flex items-center justify-between p-2.5 bg-background/60 border border-border rounded-[6px]"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={member.user.name} userId={member.user._id} size="md" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text">{member.user.name}</span>
                      {member.role === "owner" && (
                        <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.2 rounded border border-accent/20">
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-text">{member.user.email}</span>
                  </div>
                </div>

                {isOwner && member.role !== "owner" && (
                  <div>
                    {confirmRemovingUserId === member.user._id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user._id)}
                          disabled={removingUserId === member.user._id}
                          className="text-xs bg-danger text-white px-2 py-0.5 rounded font-medium hover:opacity-90 disabled:opacity-50"
                        >
                          {removingUserId === member.user._id ? "..." : "Confirm"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemovingUserId(null)}
                          disabled={removingUserId === member.user._id}
                          className="text-xs text-muted-text hover:text-text px-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRemovingUserId(member.user._id)}
                        className="text-xs text-muted-text hover:text-danger p-1 rounded transition-colors"
                        title="Remove member"
                      >
                        <FontAwesomeIcon icon={faUserMinus} className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
