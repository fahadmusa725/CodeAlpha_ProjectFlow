"use client";
import React, { useState, useId } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  id?: string;
}

export function TextField({
  label,
  error,
  id: propId,
  className = "",
  type = "text",
  ...props
}: TextFieldProps) {
  const generatedId = useId();
  const id = propId || generatedId;
  const errorId = `${id}-error`;
  const [showPassword, setShowPassword] = useState(false);

  const isPasswordType = type === "password";
  const inputType = isPasswordType ? (showPassword ? "text" : "password") : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-text">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        <input
          id={id}
          type={inputType}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-3 py-1.5 text-sm bg-white border border-border rounded-[4px] text-text placeholder:text-muted-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:bg-background ${
            isPasswordType ? "pr-10" : ""
          } ${
            error ? "border-danger focus:border-danger focus:ring-danger" : ""
          } ${className}`}
          {...props}
        />
        {isPasswordType && (
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-muted-text hover:text-text focus:outline-none focus:ring-1 focus:ring-accent rounded-[4px] transition-colors"
          >
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              className="w-4 h-4"
            />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-xs text-danger font-normal">
          {error}
        </p>
      )}
    </div>
  );
}

