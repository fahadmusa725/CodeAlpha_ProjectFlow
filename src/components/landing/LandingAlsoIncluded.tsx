import Image from "next/image";

export function LandingAlsoIncluded() {
  return (
    <section className="py-12 sm:py-16 md:py-20 border-t border-border">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-text">
              Also included
            </h2>
            <p className="mt-2 text-sm text-muted-text">
              Core capabilities built into every project:
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="border-l-2 border-border pl-3">
                <h3 className="text-sm font-semibold text-text">Project roles</h3>
                <p className="mt-1 text-xs text-muted-text leading-relaxed">
                  Assign Owner and Member roles to manage project settings and access control.
                </p>
              </div>

              <div className="border-l-2 border-border pl-3">
                <h3 className="text-sm font-semibold text-text">In-app notifications</h3>
                <p className="mt-1 text-xs text-muted-text leading-relaxed">
                  Receive direct alerts when assigned to tasks or when teammates comment on your work.
                </p>
              </div>

              <div className="border-l-2 border-border pl-3">
                <h3 className="text-sm font-semibold text-text">Phone layout</h3>
                <p className="mt-1 text-xs text-muted-text leading-relaxed">
                  A responsive mobile interface lets you review boards and update tasks from any smartphone.
                </p>
              </div>

              <div className="border-l-2 border-border pl-3">
                <h3 className="text-sm font-semibold text-text">Realtime presence</h3>
                <p className="mt-1 text-xs text-muted-text leading-relaxed">
                  See active team member avatars when colleagues view the project at the same time.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-[6px] border border-border bg-surface p-1 sm:p-2 overflow-hidden max-w-[280px] w-full">
              <Image
                src="/screens/mobile.png"
                alt="ProjectFlow mobile interface showing responsive project board on a phone screen"
                width={1179}
                height={2556}
                sizes="(max-width: 768px) 280px, 280px"
                className="w-full h-auto rounded-[4px] block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
