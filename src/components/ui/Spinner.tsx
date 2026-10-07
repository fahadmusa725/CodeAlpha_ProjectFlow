interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border",
    md: "w-5 h-5 border-2",
    lg: "w-8 h-8 border-2",
  };

  return (
    <span
      className={`inline-block animate-spin rounded-full border-current border-t-transparent ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </span>
  );
}
