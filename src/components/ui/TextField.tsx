import React from "react";

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
  ...props
}: TextFieldProps) {
  const generatedId = React.useId();
  const id = propId || generatedId;
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-text">
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`w-full px-3 py-1.5 text-sm bg-white border border-border rounded-[4px] text-text placeholder:text-muted-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 disabled:bg-background ${
          error ? "border-danger focus:border-danger focus:ring-danger" : ""
        } ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger font-normal">
          {error}
        </p>
      )}
    </div>
  );
}
