"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, Button, TextField } from "@/components/ui";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faUserMinus, faClock, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { Avatar } from "@/components/Avatar";
import { apiFetch, ApiError } from "@/lib/api";
import type { Project, Invite, InvitesListResponse } from "@/types";

interface MembersDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  isOwner: boolean;
  onProjectUpdated: (updatedProject: Project) => void;
  onMemberRemoved: () => void;
  membersVersion?: number;
}

export function MembersDialog({
  isOpen,
  onClose,
  project,
  isOwner,
  onProjectUpdated,
  onMemberRemoved,
  membersVersion = 0,
}: MembersDialogProps) {
  const [emailToAdd, setEmailToAdd] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(false);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [confirmRemovingUserId, setConfirmRemovingUserId] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    if (!isOwner || !project._id) return;
    setIsLoadingInvites(true);
    try {
      const data = await apiFetch<InvitesListResponse>(`/api/projects/${project._id}/invites`);
      setPendingInvites(data.invites || []);
    } catch {
      // Best effort load
    } finally {
      setIsLoadingInvites(false);
    }
  }, [isOwner, project._id]);

  const handleClose = () => {
    setAddError(null);
    setAddSuccess(null);
    setEmailToAdd("");
    setConfirmRevokeId(null);
    setConfirmRemovingUserId(null);
    onClose();
  };

  useEffect(() => {
    let ignore = false;
    if (isOpen && isOwner && project._id) {
      apiFetch<InvitesListResponse>(`/api/projects/${project._id}/invites`)
        .then((data) => {
          if (!ignore) {
            setPendingInvites(data.invites || []);
            setIsLoadingInvites(false);
          }
        })
        .catch(() => {
          if (!ignore) {
            setIsLoadingInvites(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, isOwner, project._id, membersVersion]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailToAdd.trim().toLowerCase();
    if (!email) return;

    setIsAdding(true);
    setAddError(null);
    setAddSuccess(null);

    try {
      const res = await apiFetch<{ project?: Project; invited?: boolean; email?: string }>(
        `/api/projects/${project._id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      if (res.invited) {
        setAddSuccess(`Invitation sent to ${res.email || email}. They can join by creating an account.`);
        setEmailToAdd("");
        loadInvites();
      } else if (res.project) {
        onProjectUpdated(res.project);
        setAddSuccess(`User ${email} added to project.`);
        setEmailToAdd("");
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setAddError("User is already a project member");
        } else if (err.status === 429) {
          setAddError("Too many invite attempts. Please try again later.");
        } else if (err.status === 503) {
          setAddError("Email is not configured, so invitations cannot be sent.");
        } else {
          setAddError(err.message || "Failed to add member");
        }
      } else if (err instanceof Error) {
        setAddError(err.message);
      } else {
        setAddError("Failed to add member");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    try {
      await apiFetch(`/api/projects/${project._id}/invites/${inviteId}`, {
        method: "DELETE",
      });
      setPendingInvites((prev) => prev.filter((inv) => inv._id !== inviteId));
      setConfirmRevokeId(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke invitation";
      setAddError(msg);
    } finally {
      setRevokingInviteId(null);
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

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} title="Project Members">
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
                  setAddSuccess(null);
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
            {addSuccess && <p className="text-xs text-accent font-medium">{addSuccess}</p>}
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
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar name={member.user.name} userId={member.user._id} size="md" />
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text truncate">{member.user.name}</span>
                      {member.role === "owner" && (
                        <span className="text-[10px] font-semibold bg-accent/10 text-accent px-1.5 py-0.2 rounded border border-accent/20 shrink-0">
                          Owner
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-muted-text truncate">{member.user.email}</span>
                  </div>
                </div>

                {isOwner && member.role !== "owner" && (
                  <div className="shrink-0 ml-2">
                    {confirmRemovingUserId === member.user._id ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member.user._id)}
                          disabled={removingUserId === member.user._id}
                          className="text-xs bg-danger text-on-accent px-2 py-0.5 rounded font-medium hover:opacity-90 disabled:opacity-50"
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

        {/* Pending Invitations (Owner Only) */}
        {isOwner && (
          <div className="flex flex-col gap-2.5 pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-text uppercase tracking-wider">
              Pending Invitations {pendingInvites.length > 0 && `(${pendingInvites.length})`}
            </h4>

            {isLoadingInvites ? (
              <p className="text-xs text-muted-text">Loading invitations...</p>
            ) : pendingInvites.length === 0 ? (
              <p className="text-xs text-muted-text">No pending invitations.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {pendingInvites.map((inv) => (
                  <div
                    key={inv._id}
                    className="flex items-center justify-between p-2.5 bg-background/60 border border-border border-dashed rounded-[6px]"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-xs font-medium text-text truncate">{inv.email}</span>
                      <span className="text-[10px] text-muted-text flex items-center gap-1 mt-0.5">
                        <FontAwesomeIcon icon={faClock} className="w-2.5 h-2.5" />
                        Sent {formatDate(inv.createdAt)}
                      </span>
                    </div>

                    <div className="shrink-0">
                      {confirmRevokeId === inv._id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleRevokeInvite(inv._id)}
                            disabled={revokingInviteId === inv._id}
                            className="text-xs bg-danger text-on-accent px-2 py-0.5 rounded font-medium hover:opacity-90 disabled:opacity-50"
                          >
                            {revokingInviteId === inv._id ? "..." : "Revoke"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeId(null)}
                            disabled={revokingInviteId === inv._id}
                            className="text-xs text-muted-text hover:text-text px-1"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmRevokeId(inv._id)}
                          className="text-xs text-muted-text hover:text-danger p-1 rounded transition-colors"
                          title="Revoke invitation"
                        >
                          <FontAwesomeIcon icon={faTrashCan} className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
