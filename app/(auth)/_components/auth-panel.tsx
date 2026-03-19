"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

  return <p className="mt-1 text-sm text-red-600">{message}</p>;
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
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-rose-200 bg-rose-50 text-rose-700";

    return <p className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}>{state.message}</p>;
  }

  if (!initialMessage) {
    return null;
  }

  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
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
        className="w-full rounded-full border-slate-300 bg-white hover:bg-slate-50"
        disabled={pending}
        onClick={handleGoogleAuth}
      >
        {pending ? "Connecting to Google..." : label}
      </Button>
      {errorMessage ? <p className="text-sm text-rose-700">{errorMessage}</p> : null}
    </div>
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
    <Card className="w-full max-w-xl border-white/70 bg-white/85 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-4">
        <CardDescription className="font-mono text-xs uppercase tracking-[0.28em] text-[#1638d4]">
          Auth
        </CardDescription>
        <CardTitle className="text-3xl tracking-[-0.04em]">Sign in</CardTitle>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          Resume your interview prep, review your scorecards, and continue from the last session.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusMessage state={state} initialMessage={initialMessage} />
        <GoogleAuthButton label="Continue with Google" nextPath={nextPath} />
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>Email and password</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
            <FieldError errors={state?.fieldErrors} name="email" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Input id="password" name="password" type="password" placeholder="password123" />
            <FieldError errors={state?.fieldErrors} name="password" />
          </div>
          <input type="hidden" name="next" value={nextPath} />
          <Button
            type="submit"
            className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <p className="text-sm text-slate-600">
          New here?{" "}
          <Link className="font-medium text-[#1638d4]" href={buildSignUpPath(nextPath)}>
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignUpPanel({
  nextPath,
}: {
  nextPath: string;
}) {
  const [state, action, pending] = useActionState(signUpAction, undefined);

  return (
    <Card className="w-full max-w-xl border-white/70 bg-white/85 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-4">
        <CardDescription className="font-mono text-xs uppercase tracking-[0.28em] text-[#1638d4]">
          Auth
        </CardDescription>
        <CardTitle className="text-3xl tracking-[-0.04em]">Create account</CardTitle>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          Create the account first, then finish role and resume setup in onboarding.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <StatusMessage state={state} />
        <GoogleAuthButton label="Continue with Google" nextPath={nextPath} />
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          <span>Email and password</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <form action={action} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
              Full name
            </label>
            <Input id="fullName" name="fullName" placeholder="Aung Htet Paing" />
            <FieldError errors={state?.fieldErrors} name="fullName" />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" />
            <FieldError errors={state?.fieldErrors} name="email" />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <Input id="password" name="password" type="password" placeholder="password123" />
            <FieldError errors={state?.fieldErrors} name="password" />
          </div>
          <input type="hidden" name="next" value={nextPath} />
          <Button
            type="submit"
            className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Create account"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <p className="text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-[#1638d4]" href={buildSignInPath(nextPath)}>
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
