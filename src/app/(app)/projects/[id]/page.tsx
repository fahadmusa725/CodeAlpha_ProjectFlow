import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faFolder,
  faUsers,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import type { ProjectDetailResponse } from "@/types";

async function getProject(
  id: string
): Promise<{ project: ProjectDetailResponse["project"] | null; notFound: boolean }> {
  try {
    const reqHeaders = await headers();
    const cookieHeader = reqHeaders.get("cookie");

    const host = reqHeaders.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";

    const res = await fetch(`${protocol}://${host}/api/projects/${id}`, {
      headers: {
        cookie: cookieHeader || "",
      },
      cache: "no-store",
    });

    if (res.status === 404) {
      return { project: null, notFound: true };
    }

    if (!res.ok) {
      return { project: null, notFound: false };
    }

    const data: ProjectDetailResponse = await res.json();
    return { project: data.project, notFound: false };
  } catch {
    return { project: null, notFound: false };
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const { project, notFound } = await getProject(resolvedParams.id);

  if (notFound || !project) {
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

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center text-xs font-medium text-muted-text hover:text-text transition-colors mb-3"
        >
          <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 mr-1.5" />
          Back to Projects
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-[4px] bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <FontAwesomeIcon icon={faFolder} className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-xs text-muted-text mt-0.5">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-border bg-surface rounded-[6px] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2 border-b border-border pb-3">
          <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-muted-text" />
          Members ({project.members.length})
        </h2>
        <ul className="divide-y divide-border">
          {project.members.map((member, index) => {
            const memberUser =
              typeof member.user === "object" && member.user !== null
                ? member.user
                : { _id: String(index), name: "Unknown", email: "" };

            return (
              <li key={memberUser._id || index} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-text">{memberUser.name}</span>
                  {memberUser.email && (
                    <span className="text-muted-text ml-2">({memberUser.email})</span>
                  )}
                </div>
                <span
                  className={`capitalize px-2 py-0.5 rounded-[4px] border text-[10px] font-semibold ${
                    member.role === "owner"
                      ? "bg-accent/10 border-accent/20 text-accent"
                      : "bg-background border-border text-muted-text"
                  }`}
                >
                  {member.role}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="bg-background border border-border rounded-[6px] p-4 text-center">
        <p className="text-xs text-muted-text">
          Task board, sprint planning, and task management UI will be added in Phase 3B.
        </p>
      </div>
    </div>
  );
}
