import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/50 bg-white/55 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
            AI
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Interview coach
            </p>
            <p className="text-sm text-slate-700">
              Realtime mock interviews for software roles
            </p>
          </div>
        </Link>
        <div className="hidden items-center gap-3 md:flex">
          <Badge
            variant="outline"
            className="rounded-full border-slate-300 bg-white/70"
          >
            TDD-first
          </Badge>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", className: "rounded-full" }))}
          >
            Dashboard
          </Link>
          <a
            href="https://github.com/aunghtetpaing10/ai-interview-coach"
            target="_blank"
            rel="noreferrer"
            className={cn(
              buttonVariants({
                className: "rounded-full bg-slate-950 text-white hover:bg-slate-800",
              }),
            )}
          >
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}
