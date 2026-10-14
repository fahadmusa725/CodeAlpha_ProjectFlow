import Image from "next/image";
import Link from "next/link";

export function LandingHero() {
  return (
    <section className="py-12 sm:py-16 md:py-20">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="max-w-2xl text-left">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-text leading-tight">
            Manage tasks and collaborate with your team in real time.
          </h1>
          <p className="mt-4 text-base sm:text-lg text-muted-text leading-relaxed">
            Organize work on a visual kanban board, assign responsibilities, track due dates, and monitor project progress.
          </p>
          <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center justify-center text-sm font-medium text-on-accent bg-accent hover:bg-accent-hover rounded-[4px] px-5 min-h-[40px] transition-colors focus-visible:outline-2 focus-visible:outline-accent"
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

        <div className="mt-10 sm:mt-12 rounded-[6px] border border-border bg-surface p-1 sm:p-2 overflow-hidden">
          <Image
            src="/screens/board.png"
            alt="ProjectFlow kanban board showing columns for Todo, In Progress, Review, and Done with task cards"
            width={2560}
            height={1600}
            priority
            sizes="(max-width: 1100px) 100vw, 1100px"
            className="w-full h-auto rounded-[4px] block"
          />
        </div>
      </div>
    </section>
  );
}
