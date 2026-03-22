import { SignUpPanel } from "@/app/(auth)/_components/auth-panel";
import { resolvePostAuthPath } from "@/lib/auth/paths";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const nextPath = resolvePostAuthPath((await searchParams)?.next);

  return (
    <section className="grid w-full gap-10 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
      <div className="hidden xl:block xl:space-y-6">
        <p className="curator-kicker">Private workspace access</p>
        <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.06em] text-[color:var(--curator-ink)] sm:text-6xl">
          Create your account, then finish setup in onboarding.
        </h1>
        <p className="max-w-lg text-lg leading-8 text-muted-foreground">
          Start with the secure account, then move into the role, resume, and job
          context that power the Curator interview loop.
        </p>
        <div className="rounded-[1.8rem] border border-[color:var(--curator-line)] bg-white/72 p-6 shadow-[var(--curator-shadow)]">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--curator-orange)]">
            What happens next
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
            <p>Save a target role and job description so the interviewer stays grounded.</p>
            <p>Upload or paste resume context to give follow-ups a real narrative spine.</p>
            <p>Enter the live room once the profile is complete.</p>
          </div>
        </div>
      </div>
      <SignUpPanel nextPath={nextPath} />
    </section>
  );
}
