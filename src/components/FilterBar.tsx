"use client";

import React, { useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMagnifyingGlass, faXmark, faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import type { ProjectMember, TaskPriority } from "@/types";

export interface BoardFilters {
  search: string;
  assigneeId: string; // "" = anyone, "unassigned" = unassigned
  label: string;
  priority: "" | TaskPriority;
  overdue: boolean;
}

interface FilterBarProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  members: ProjectMember[];
  allLabels: string[];
  visibleCount: number;
  totalCount: number;
  filtersActive: boolean;
  onClear: () => void;
}

export function FilterBar({
  filters,
  onChange,
  members,
  allLabels,
  visibleCount,
  totalCount,
  filtersActive,
  onClear,
}: FilterBarProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" shortcut to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      const isEditable = tag === "input" || tag === "textarea" || tag === "select";
      const inDialog = !!(e.target as HTMLElement).closest("dialog[open]");
      if (isEditable || inDialog) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const set = (patch: Partial<BoardFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="bg-surface border border-border rounded-[8px] px-4 py-3 flex flex-col gap-2.5">
      <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
        {/* Search – full width on mobile */}
        <div className="relative flex-1 min-w-0 w-full sm:w-auto sm:max-w-xs">
          <FontAwesomeIcon
            icon={faMagnifyingGlass}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-text pointer-events-none"
          />
          <input
            ref={searchRef}
            type="search"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder='Search tasks… ("/" to focus)'
            className="w-full bg-background border border-border rounded-[4px] pl-7 pr-3 py-1.5 text-xs text-text placeholder:text-muted-text focus-visible:outline-accent"
            aria-label="Search tasks by title or description"
          />
        </div>

        {/* Filters row – wraps on mobile */}
        <div className="flex flex-wrap gap-2">
          {/* Assignee */}
          <select
            value={filters.assigneeId}
            onChange={(e) => set({ assigneeId: e.target.value })}
            className="bg-background border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
            aria-label="Filter by assignee"
          >
            <option value="">Anyone</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>

          {/* Label */}
          {allLabels.length > 0 && (
            <select
              value={filters.label}
              onChange={(e) => set({ label: e.target.value })}
              className="bg-background border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
              aria-label="Filter by label"
            >
              <option value="">Any label</option>
              {allLabels.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          {/* Priority */}
          <select
            value={filters.priority}
            onChange={(e) => set({ priority: e.target.value as BoardFilters["priority"] })}
            className="bg-background border border-border rounded-[4px] px-2.5 py-1.5 text-xs text-text focus-visible:outline-accent"
            aria-label="Filter by priority"
          >
            <option value="">Any priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Overdue toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-text bg-background border border-border rounded-[4px] px-2.5 py-1.5">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => set({ overdue: e.target.checked })}
              className="accent-accent w-3 h-3"
            />
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3 text-danger" />
            Overdue
          </label>

          {/* Clear */}
          {filtersActive && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-xs font-medium text-muted-text hover:text-text border border-border bg-background rounded-[4px] px-2.5 py-1.5 transition-colors focus-visible:outline-accent"
            >
              <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Count */}
      {filtersActive && (
        <p className="text-[11px] text-muted-text">
          Showing <strong className="text-text">{visibleCount}</strong> of{" "}
          <strong className="text-text">{totalCount}</strong> tasks
        </p>
      )}
    </div>
  );
}
