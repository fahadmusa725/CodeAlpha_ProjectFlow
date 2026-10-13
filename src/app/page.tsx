import type { Metadata } from "next";
import {
  LandingHeader,
  LandingHero,
  LandingFeatures,
  LandingAlsoIncluded,
  LandingCta,
  LandingFooter,
} from "@/components/landing";

export const metadata: Metadata = {
  title: "ProjectFlow — Collaborative Project & Task Management",
  description:
    "Organize tasks with drag-and-drop kanban boards, real-time collaboration, priority labels, due dates, in-app notifications, and project analytics.",
};

export default function LandingPage() {
  return (
    <div className="min-h-full flex flex-col bg-background text-text" id="top">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-[4px] focus:shadow-sm"
      >
        Skip to content
      </a>

      <LandingHeader />

      <main id="main-content" className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingAlsoIncluded />
        <LandingCta />
      </main>

      <LandingFooter />
    </div>
  );
}
