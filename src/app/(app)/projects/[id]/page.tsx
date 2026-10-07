import React from "react";
import { ProjectBoardClient } from "@/components/ProjectBoardClient";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  return <ProjectBoardClient projectId={resolvedParams.id} />;
}
