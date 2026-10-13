import Link from "next/link";

export function LandingCta() {
  return (
    <section className="py-12 sm:py-16 md:py-20 border-t border-border bg-surface">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-text">
          Start managing your projects with ProjectFlow today.
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center text-sm font-medium text-white bg-accent hover:bg-accent-hover rounded-[4px] px-5 min-h-[40px] transition-colors focus-visible:outline-2 focus-visible:outline-accent"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center text-sm font-medium text-text bg-surface border border-border hover:bg-background rounded-[4px] px-5 min-h-[40px] transition-colors focus-visible:outline-2 focus-visible:outline-text"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}
