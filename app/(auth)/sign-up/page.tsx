import { SignUpPanel } from "@/app/(auth)/_components/auth-panel";
import { resolvePostAuthPath } from "@/lib/auth/paths";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const nextPath = resolvePostAuthPath((await searchParams)?.next);

  return (
    <section className="grid w-full gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
      <div className="space-y-6">
        <p className="font-mono text-xs uppercase tracking-[0.32em] text-[#1638d4]">
          AI Interview Coach
        </p>
        <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] sm:text-6xl">
          Create your account, then finish setup in onboarding.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-slate-700">
          The first sign-up flow creates the auth session first, then routes candidates into onboarding for the role and resume setup.
        </p>
      </div>
      <SignUpPanel nextPath={nextPath} />
    </section>
  );
}
