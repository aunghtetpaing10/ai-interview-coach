import { SignInPanel } from "@/app/(auth)/_components/auth-panel";
import { getAuthErrorMessage } from "@/lib/auth/messages";
import { resolvePostAuthPath } from "@/lib/auth/paths";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = resolvePostAuthPath(params?.next);
  const initialMessage = getAuthErrorMessage(params?.error);

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
          Use email or Google to get back into your workspace. Onboarding owns the role and resume setup after auth.
        </p>
      </div>
      <SignInPanel nextPath={nextPath} initialMessage={initialMessage} />
    </section>
  );
}
