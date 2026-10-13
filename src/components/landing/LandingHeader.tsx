import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-xs border-b border-border">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-text hover:text-accent transition-colors flex items-center min-h-[40px]"
        >
          ProjectFlow
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-4 sm:gap-6">
          <a
            href="#features"
            className="hidden sm:inline-flex items-center text-sm font-medium text-muted-text hover:text-text transition-colors min-h-[40px] px-2"
          >
            Features
          </a>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-sm font-medium text-text bg-surface border border-border hover:bg-background rounded-[4px] px-3.5 min-h-[40px] transition-colors focus-visible:outline-2 focus-visible:outline-text"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-[4px] px-3.5 min-h-[40px] transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            Create account
          </Link>
        </nav>
      </div>
    </header>
  );
}
