import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(22,56,212,0.12),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(236,120,67,0.14),_transparent_28%),linear-gradient(180deg,_#f7f7f2_0%,_#f1ece3_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-6xl items-center justify-center">
        {children}
      </div>
    </main>
  );
}
