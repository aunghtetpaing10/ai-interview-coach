import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireWorkspaceUser } from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireWorkspaceUser("/workspace");

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,56,212,0.08),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(236,120,67,0.12),_transparent_28%),linear-gradient(180deg,_#f7f7f2_0%,_#f3eee5_100%)]">
      <header className="border-b border-white/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Link href="/workspace" className="space-y-1">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#1638d4]">
              Workspace
            </p>
            <p className="text-sm text-slate-600">
              Protected candidate shell for {user.email}
            </p>
          </Link>
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({
                className: "rounded-full bg-slate-950 text-white hover:bg-slate-800",
              }),
            )}
          >
            Switch account
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-6 py-10 lg:px-10">{children}</main>
    </div>
  );
}
