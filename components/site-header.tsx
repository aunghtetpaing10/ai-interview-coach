import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[color:var(--curator-line)] bg-[#fbf7f0]/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
        <Link href="/" className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--curator-navy)] text-sm font-semibold text-[color:var(--primary-foreground)] shadow-[0_18px_32px_-20px_rgba(20,63,134,0.7)]">
            TC
          </div>
          <div className="space-y-1">
            <p className="font-serif text-2xl leading-none tracking-[-0.04em] text-[color:var(--curator-ink)]">
              The Curator
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.26em] text-[color:var(--curator-orange)]">
              Editorial interview intelligence
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <Badge
            variant="outline"
            className="border-[color:var(--curator-line)] bg-white/75 text-[color:var(--curator-ink)]"
          >
            Private preview
          </Badge>
          <a href="#method" className={cn(buttonVariants({ variant: "ghost" }))}>
            Method
          </a>
          <a href="#proof" className={cn(buttonVariants({ variant: "ghost" }))}>
            Proof
          </a>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({
                size: "lg",
                className:
                  "h-11 bg-[color:var(--curator-navy)] px-5 text-[color:var(--primary-foreground)] hover:bg-[color:var(--curator-navy-strong)]",
              }),
            )}
          >
            Sign in
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
