"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Sparkles } from "lucide-react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import type { AuthActionState, AuthFieldErrors } from "@/lib/auth/forms";
import {
  buildAuthCallbackPath,
  buildSignInPath,
  buildSignUpPath,
} from "@/lib/auth/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function FieldError({
  errors,
  name,
}: {
  errors?: AuthFieldErrors;
  name: keyof AuthFieldErrors;
}) {
  const message = errors?.[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="mt-1 text-sm text-red-700">{message}</p>;
}

function StatusMessage({
  state,
  initialMessage,
}: {
  state?: AuthActionState;
  initialMessage?: string | null;
}) {
  if (state?.message) {
    const tone =
      state.status === "needs_confirmation"
        ? "border-emerald-200 bg-emerald-50/80 text-emerald-900"
        : "border-rose-200 bg-rose-50/80 text-rose-700";

    return <p className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{state.message}</p>;
  }

  if (!initialMessage) {
    return null;
  }

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
      {initialMessage}
    </p>
  );
}

function GoogleAuthButton({
  nextPath,
  label,
}: {
  nextPath: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGoogleAuth() {
    setPending(true);
    setErrorMessage(null);

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setErrorMessage("Supabase credentials are not configured yet.");
      setPending(false);
      return;
    }

    const redirectTo = new URL(buildAuthCallbackPath(nextPath), window.location.origin).toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="h-11 w-full justify-center border-[color:var(--curator-line)] bg-white/88 text-[color:var(--curator-ink)] hover:bg-white"
        disabled={pending}
        onClick={handleGoogleAuth}
      >
        {pending ? "Connecting to Google..." : label}
      </Button>
      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
    </div>
  );
}

function AuthPanelShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="curator-card w-full max-w-[34rem] border-white/70 bg-white/82 backdrop-blur">
      <CardHeader className="space-y-5 border-b border-[color:var(--curator-line)] pb-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <CardDescription className="curator-kicker">{eyebrow}</CardDescription>
            <CardTitle className="font-serif text-5xl tracking-[-0.05em] text-[color:var(--curator-ink)]">
              {title}
            </CardTitle>
          </div>
          <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:var(--curator-navy)] text-[color:var(--primary-foreground)]">
            <LockKeyhole className="size-5" />
          </div>
        </div>
        <p className="max-w-lg text-sm leading-7 text-muted-foreground">
          {description}
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--curator-orange)]">
          <Sparkles className="size-3.5" />
          Secure access to reports, transcripts, and rehearsal history
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-6">
        {children}
        <div className="border-t border-[color:var(--curator-line)] pt-5 text-sm text-muted-foreground">
          {footer}
        </div>
      </CardContent>
    </Card>
  );
}

export function SignInPanel({
  nextPath,
  initialMessage,
}: {
  nextPath: string;
  initialMessage?: string | null;
}) {
  const [state, action, pending] = useActionState(signInAction, undefined);

  return (
    <AuthPanelShell
      eyebrow="Workspace access"
      title="Sign in"
      description="Resume your interview prep, review the latest report, and continue the next deliberate rehearsal without losing the evidence trail."
      footer={
        <p>
          New here?{" "}
          <Link className="font-semibold text-[color:var(--curator-navy)]" href={buildSignUpPath(nextPath)}>
            Create an account
          </Link>
        </p>
      }
    >
      <StatusMessage state={state} initialMessage={initialMessage} />
      <GoogleAuthButton label="Continue with Google" nextPath={nextPath} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-px flex-1 bg-[color:var(--curator-line)]" />
        <span>Email and password</span>
        <span className="h-px flex-1 bg-[color:var(--curator-line)]" />
      </div>
      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[color:var(--curator-ink)]">
            Email
          </label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" />
          <FieldError errors={state?.fieldErrors} name="email" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[color:var(--curator-ink)]">
            Password
          </label>
          <Input id="password" name="password" type="password" placeholder="password123" />
          <FieldError errors={state?.fieldErrors} name="password" />
        </div>
        <input type="hidden" name="next" value={nextPath} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Signing in..." : "Sign in"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthPanelShell>
  );
}

export function SignUpPanel({
  nextPath,
}: {
  nextPath: string;
}) {
  const [state, action, pending] = useActionState(signUpAction, undefined);

  return (
    <AuthPanelShell
      eyebrow="Create access"
      title="Create account"
      description="Create the secure account first, then finish the role and resume setup that powers the Curator interview loop."
      footer={
        <p>
          Already have an account?{" "}
          <Link className="font-semibold text-[color:var(--curator-navy)]" href={buildSignInPath(nextPath)}>
            Sign in
          </Link>
        </p>
      }
    >
      <StatusMessage state={state} />
      <GoogleAuthButton label="Continue with Google" nextPath={nextPath} />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <span className="h-px flex-1 bg-[color:var(--curator-line)]" />
        <span>Email and password</span>
        <span className="h-px flex-1 bg-[color:var(--curator-line)]" />
      </div>
      <form action={action} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="fullName" className="text-sm font-medium text-[color:var(--curator-ink)]">
            Full name
          </label>
          <Input id="fullName" name="fullName" placeholder="Aung Htet Paing" />
          <FieldError errors={state?.fieldErrors} name="fullName" />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-[color:var(--curator-ink)]">
            Email
          </label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" />
          <FieldError errors={state?.fieldErrors} name="email" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-[color:var(--curator-ink)]">
            Password
          </label>
          <Input id="password" name="password" type="password" placeholder="password123" />
          <FieldError errors={state?.fieldErrors} name="password" />
        </div>
        <input type="hidden" name="next" value={nextPath} />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending}
        >
          {pending ? "Creating account..." : "Create account"}
          <ArrowRight className="size-4" />
        </Button>
      </form>
    </AuthPanelShell>
  );
}
