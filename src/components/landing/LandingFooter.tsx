export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-8">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-text">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="font-semibold text-text">ProjectFlow</span>
          <span className="hidden sm:inline">|</span>
          <span>Built as a CodeAlpha internship project</span>
        </div>

        <div>
          <a
            href="#top"
            className="text-muted-text hover:text-text transition-colors p-2 min-h-[40px] inline-flex items-center"
          >
            Back to top
          </a>
        </div>
      </div>
    </footer>
  );
}
