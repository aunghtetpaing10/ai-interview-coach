import { SignInPanel } from "@/app/(auth)/_components/auth-panel";

export default function SignInPage() {
  return (
    <section className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#1638d4]">
          AI Interview Coach
        </p>
        <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
          Sign in to a workspace that keeps your interview prep tied to real evidence.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-slate-700">
          The auth layer is wired for Supabase sessions, protected routes, and future data access without locking the app into a mock-only model.
        </p>
      </div>
      <SignInPanel />
    </section>
  );
}
