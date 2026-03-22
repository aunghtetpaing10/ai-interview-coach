import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="curator-shell min-h-screen px-6 py-8 text-[color:var(--curator-ink)] lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-[color:var(--curator-line)] pb-5">
          <div className="space-y-1">
            <p className="font-serif text-3xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
              The Curator
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--curator-orange)]">
              Secure candidate workspace
            </p>
          </div>
          <p className="hidden max-w-sm text-right text-sm leading-6 text-muted-foreground sm:block">
            Resume the rehearsal loop, keep the evidence, and let the next report
            sharpen the story.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          {children}
        </div>
      </div>
    </main>
  );
}
