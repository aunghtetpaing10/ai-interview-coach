import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/interview", label: "Interviews" },
  { href: "/reports", label: "Reports" },
  { href: "/onboarding", label: "Resume / JD" },
  { href: "/progress", label: "Progress" },
] as const;

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "TC"
  );
}

function isActiveItem(itemHref: string, activeHref: string) {
  return activeHref === itemHref || activeHref.startsWith(`${itemHref}/`);
}

type CandidateShellProps = {
  activeHref: string;
  userLabel: string;
  headline: string;
  children: ReactNode;
  railNote?: ReactNode;
};

export function CandidateShell({
  activeHref,
  userLabel,
  headline,
  children,
  railNote,
}: CandidateShellProps) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(227,117,67,0.17),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(27,57,88,0.12),_transparent_30%),linear-gradient(180deg,_#f5ede0_0%,_#efe4d5_44%,_#f7f0e5_100%)]">
      <main className="mx-auto flex w-full max-w-[1440px] gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col">
          <div className="sticky top-4 flex h-[calc(100vh-2rem)] flex-col rounded-[32px] border border-[#1d3557]/10 bg-[#f7efe2]/90 p-6 shadow-[0_24px_80px_-48px_rgba(27,57,88,0.55)] backdrop-blur">
            <div className="space-y-6">
              <Badge className="w-fit rounded-full border border-[#1b3958]/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1b3958]">
                The Curator
              </Badge>
              <div className="rounded-[28px] bg-[#1b3958] p-5 text-white">
                <div className="flex items-center gap-3">
                  <Avatar className="size-12 border border-white/10 bg-white/10">
                    <AvatarFallback className="bg-transparent text-white">
                      {getInitials(userLabel)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/60">
                      Signed in
                    </p>
                    <p className="mt-1 text-2xl font-semibold tracking-[-0.04em]">
                      {userLabel}
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/75">{headline}</p>
              </div>
            </div>

            <nav className="mt-8 flex flex-1 flex-col gap-2">
              {navItems.map((item) => {
                const active = isActiveItem(item.href, activeHref);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-4 py-3 text-sm font-medium transition",
                      active
                        ? "bg-[#1b3958] text-white shadow-[0_16px_40px_-28px_rgba(27,57,88,0.9)]"
                        : "text-[#1b3958] hover:bg-white/75",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-4 border-t border-[#1b3958]/10 pt-5">
              {railNote ? (
                <div className="rounded-[24px] border border-[#1b3958]/10 bg-white/70 p-4 text-sm leading-6 text-slate-600">
                  {railNote}
                </div>
              ) : null}
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[#1b3958]/15 bg-white px-4 py-3 text-sm font-medium text-[#1b3958] transition hover:bg-[#1b3958] hover:text-white"
                >
                  <LogOut className="size-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="rounded-[30px] border border-white/60 bg-[#f9f4eb]/90 p-4 shadow-[0_24px_80px_-52px_rgba(27,57,88,0.45)] backdrop-blur sm:p-6 lg:hidden">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-[#1b3958]/70">
                  The Curator
                </p>
                <h1 className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[#122033]">
                  {userLabel}
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">{headline}</p>
              </div>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="rounded-full border border-[#1b3958]/15 bg-white px-4 py-2 text-sm font-medium text-[#1b3958]"
                >
                  Sign out
                </button>
              </form>
            </div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {navItems.map((item) => {
                const active = isActiveItem(item.href, activeHref);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition",
                      active
                        ? "bg-[#1b3958] text-white"
                        : "border border-[#1b3958]/10 bg-white text-[#1b3958]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </section>

          {children}
        </div>
      </main>
    </div>
  );
}
