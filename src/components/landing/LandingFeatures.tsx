import Image from "next/image";

export function LandingFeatures() {
  return (
    <section id="features" className="py-12 sm:py-16 md:py-20 border-t border-border">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24">
        {/* Section 1: Realtime Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-text">
              Realtime kanban board with drag and drop
            </h2>
            <p className="mt-3 text-muted-text leading-relaxed">
              Move tasks across custom workflow columns with fluid drag and drop. Every change synchronizes instantly across open browsers, showing online team members and live card movements as they happen.
            </p>
          </div>
          <div className="rounded-[6px] border border-border bg-surface p-1 sm:p-2 overflow-hidden">
            <Image
              src="/screens/board.png"
              alt="Realtime board view with live updates and presence across project members"
              width={2560}
              height={1600}
              sizes="(max-width: 768px) 100vw, 550px"
              className="w-full h-auto rounded-[4px] block"
            />
          </div>
        </div>

        {/* Section 2: Task details and comments (reversed on wide screens) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1 flex justify-center">
            <div className="rounded-[6px] border border-border bg-surface p-1 sm:p-2 overflow-hidden max-w-[420px] w-full">
              <Image
                src="/screens/task.png"
                alt="Task details dialog displaying priority, labels, assignee, due date, and team comments"
                width={571}
                height={795}
                sizes="(max-width: 768px) 100vw, 420px"
                className="w-full h-auto rounded-[4px] block"
              />
            </div>
          </div>
          <div className="order-1 md:order-2">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-text">
              Task priority, labels, due dates, and discussion
            </h2>
            <p className="mt-3 text-muted-text leading-relaxed">
              Open any card to set priorities, tag custom colored labels, define target dates, and assign teammates. Team members can post comments directly on the task to keep context in one place.
            </p>
          </div>
        </div>

        {/* Section 3: Project Dashboard with Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-text">
              Project dashboard with statistics
            </h2>
            <p className="mt-3 text-muted-text leading-relaxed">
              Understand project health with clear metrics. Review task distribution across columns, identify overdue work, track completion rates, and observe team workload balance without manual spreadsheets.
            </p>
          </div>
          <div className="rounded-[6px] border border-border bg-surface p-1 sm:p-2 overflow-hidden">
            <Image
              src="/screens/dashboard.png"
              alt="Project dashboard charts and summary statistics showing completion progress and workload"
              width={2560}
              height={1600}
              sizes="(max-width: 768px) 100vw, 550px"
              className="w-full h-auto rounded-[4px] block"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
