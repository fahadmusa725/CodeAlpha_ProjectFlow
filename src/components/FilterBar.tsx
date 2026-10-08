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
      {/* Search – always full width */}
      <div className="relative w-full">
        <FontAwesomeIcon
          icon={faMagnifyingGlass}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-text pointer-events-none"
        />
        <input
          ref={searchRef}
          id="filter-search-input"
          name="search"
          type="search"
          value={filters.search}
          onChange={(e) => set({ search: e.target.value })}
          placeholder='Search tasks… ("/" to focus)'
          className="w-full bg-background border border-border rounded-[4px] pl-7 pr-3 py-2.5 sm:py-1.5 text-xs text-text placeholder:text-muted-text focus-visible:outline-accent min-h-[40px] sm:min-h-0"
          aria-label="Search tasks by title or description"
        />
      </div>

      {/* Filters – 2-col grid on mobile, single flex row on sm+ */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        {/* Assignee */}
        <select
          id="filter-assignee-select"
          name="assigneeId"
          value={filters.assigneeId}
          onChange={(e) => set({ assigneeId: e.target.value })}
          className="w-full bg-background border border-border rounded-[4px] px-2.5 py-2.5 sm:py-1.5 text-xs text-text focus-visible:outline-accent min-h-[40px] sm:min-h-0"
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

        {/* Priority */}
        <select
          id="filter-priority-select"
          name="priority"
          value={filters.priority}
          onChange={(e) => set({ priority: e.target.value as BoardFilters["priority"] })}
          className="w-full bg-background border border-border rounded-[4px] px-2.5 py-2.5 sm:py-1.5 text-xs text-text focus-visible:outline-accent min-h-[40px] sm:min-h-0"
          aria-label="Filter by priority"
        >
          <option value="">Any priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Label */}
        {allLabels.length > 0 && (
          <select
            id="filter-label-select"
            name="label"
            value={filters.label}
            onChange={(e) => set({ label: e.target.value })}
            className="w-full bg-background border border-border rounded-[4px] px-2.5 py-2.5 sm:py-1.5 text-xs text-text focus-visible:outline-accent min-h-[40px] sm:min-h-0"
            aria-label="Filter by label"
          >
            <option value="">Any label</option>
            {allLabels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        )}

        {/* Overdue toggle */}
        <label htmlFor="filter-overdue-checkbox" className="flex items-center gap-1.5 cursor-pointer select-none text-xs font-medium text-text bg-background border border-border rounded-[4px] px-2.5 py-2.5 sm:py-1.5 min-h-[40px] sm:min-h-0">
          <input
            id="filter-overdue-checkbox"
            name="overdue"
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
            className="flex items-center gap-1 text-xs font-medium text-muted-text hover:text-text border border-border bg-background rounded-[4px] px-2.5 py-2.5 sm:py-1.5 transition-colors focus-visible:outline-accent min-h-[40px] sm:min-h-0"
          >
            <FontAwesomeIcon icon={faXmark} className="w-3 h-3" />
            Clear
          </button>
        )}
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
