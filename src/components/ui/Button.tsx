import React from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  isLoading = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium text-sm rounded-[4px] px-3.5 py-1.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-accent text-white hover:bg-accent-hover focus-visible:outline-accent",
    secondary:
      "bg-white text-text border border-border hover:bg-background focus-visible:outline-text",
    danger:
      "bg-danger text-white hover:bg-[#991B1B] focus-visible:outline-danger",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" className="mr-2" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
