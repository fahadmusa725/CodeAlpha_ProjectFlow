"use client";

import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ isOpen, onClose, title, children, className }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("cancel", handleCancel);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={`backdrop:bg-black/40 bg-surface text-text p-0 shadow-lg border border-border
        w-full max-w-full max-h-[100dvh] rounded-none m-0
        sm:rounded-[6px] sm:max-w-md sm:w-full sm:m-auto sm:max-h-[90dvh]
        ${className || ""}`}
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5 sticky top-0 bg-surface z-10">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-text hover:text-text p-1 rounded transition-colors focus-visible:outline-accent min-w-[32px] min-h-[32px] flex items-center justify-center"
          aria-label="Close dialog"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 overflow-y-auto max-h-[calc(100dvh-56px)] sm:max-h-[calc(90dvh-56px)] scrollbar-thin">
        {children}
      </div>
    </dialog>
  );
}
