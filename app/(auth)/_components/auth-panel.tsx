"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import type { AuthFieldErrors } from "@/lib/auth/forms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

export function SignInPanel() {
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
      <CardContent>
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
          <input type="hidden" name="next" value="/workspace" />
          {state?.message ? <p className="text-sm text-slate-700">{state.message}</p> : null}
          <Button
            className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
            disabled={pending}
          >
            {pending ? "Signing in..." : "Sign in"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          New here?{" "}
          <Link className="font-medium text-[#1638d4]" href="/sign-up">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export function SignUpPanel() {
  const [state, action, pending] = useActionState(signUpAction, undefined);

  return (
    <Card className="w-full max-w-xl border-white/70 bg-white/85 shadow-[0_28px_90px_-45px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="space-y-4">
        <CardDescription className="font-mono text-xs uppercase tracking-[0.28em] text-[#1638d4]">
          Auth
        </CardDescription>
        <CardTitle className="text-3xl tracking-[-0.04em]">Create account</CardTitle>
        <p className="max-w-lg text-sm leading-6 text-slate-600">
          Set your target role once, then keep your resume, sessions, and scorecards tied to one workspace.
        </p>
      </CardHeader>
      <CardContent>
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
          <div className="space-y-2">
            <label htmlFor="targetRole" className="text-sm font-medium text-slate-700">
              Target role
            </label>
            <Textarea
              id="targetRole"
              name="targetRole"
              placeholder="Mid-level software engineer at a product company"
            />
            <FieldError errors={state?.fieldErrors} name="targetRole" />
          </div>
          <input type="hidden" name="next" value="/workspace" />
          {state?.message ? <p className="text-sm text-slate-700">{state.message}</p> : null}
          <Button
            className="w-full rounded-full bg-slate-950 text-white hover:bg-slate-800"
            disabled={pending}
          >
            {pending ? "Creating account..." : "Create account"}
            <ArrowRight className="size-4" />
          </Button>
        </form>
        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link className="font-medium text-[#1638d4]" href="/sign-in">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
