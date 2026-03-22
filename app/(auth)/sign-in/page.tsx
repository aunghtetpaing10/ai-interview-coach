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
    <section className="grid w-full gap-10 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
      <div className="hidden xl:block xl:space-y-6">
        <p className="curator-kicker">Editorial rehearsal loop</p>
        <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] text-[color:var(--curator-ink)] sm:text-6xl">
          Sign in to a workspace that keeps your interview prep tied to real evidence.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-muted-foreground">
          Use email or Google to return to your dashboard, review the latest audit,
          and keep the rehearsal loop moving without losing context.
        </p>
        <div className="rounded-[1.8rem] border border-[color:var(--curator-line)] bg-white/72 p-6 shadow-[var(--curator-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--curator-orange)]">
            Session expectations
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>Google OAuth remains the fastest route back into the workspace.</p>
            <p>Email and password stay available for credential-based access.</p>
            <p>Onboarding remains the first-stop flow when a profile is still incomplete.</p>
          </div>
        </div>
      </div>
      <SignInPanel nextPath={nextPath} initialMessage={initialMessage} />
    </section>
  );
}
