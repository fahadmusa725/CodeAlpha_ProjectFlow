"use client";

import React, { useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, children }: DialogProps) {
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
      className="backdrop:bg-black/40 rounded-[6px] border border-border bg-surface text-text p-0 shadow-lg max-w-md w-full m-auto"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
        <h2 className="text-base font-semibold text-text">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-text hover:text-text p-1 rounded transition-colors focus-visible:outline-accent"
          aria-label="Close dialog"
        >
          <FontAwesomeIcon icon={faXmark} className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
