"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { apiFetch, ApiError } from "@/lib/api";

interface AcceptInviteButtonProps {
  token: string;
  projectName: string;
}

export function AcceptInviteButton({ token, projectName }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await apiFetch<{ projectId: string }>("/api/invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      router.push(`/projects/${res.projectId}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Failed to join project");
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 mt-4">
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger text-xs p-3 rounded-[4px]">
          {error}
        </div>
      )}
      <Button
        type="button"
        isLoading={isLoading}
        onClick={handleAccept}
        className="w-full"
      >
        Join {projectName}
      </Button>
    </div>
  );
}
