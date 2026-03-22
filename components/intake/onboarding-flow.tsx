"use client";

import { useActionState, type ReactNode } from "react";
import { ArrowRight, FileUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingSubmissionState } from "@/lib/intake/types";
import { submitOnboardingDraft } from "@/app/onboarding/actions";
import { SummaryPanel } from "@/components/intake/summary-panel";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-600">{message}</p>;
}

function StepBadge({ step, label }: { step: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <Badge className="rounded-full bg-[#1638d4] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
        {step}
      </Badge>
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
    </div>
  );
}

function SectionShell({
  title,
  description,
  children,
  step,
  label,
}: {
  title: string;
  description: string;
  children: ReactNode;
  step: string;
  label: string;
}) {
  return (
    <Card className="border-slate-200/70 bg-white/85 shadow-[0_16px_60px_-40px_rgba(15,23,42,0.25)]">
      <CardHeader className="space-y-4">
        <StepBadge step={step} label={label} />
        <div className="space-y-2">
          <CardTitle className="text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            {title}
          </CardTitle>
          <CardDescription className="max-w-2xl text-base leading-7 text-slate-600">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function OnboardingFlow({
  initialState,
}: {
  initialState: OnboardingSubmissionState;
}) {
  const [state, formAction, pending] = useActionState(
    submitOnboardingDraft,
    initialState,
  );

  const currentState: OnboardingSubmissionState = state;
  const fieldErrors = currentState.fieldErrors;
  const formValues = currentState.formValues;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <form action={formAction} className="space-y-6" aria-busy={pending}>
        <section className="grid gap-3 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_-45px_rgba(15,23,42,0.3)]">
          <Badge className="w-fit rounded-full bg-slate-950 text-white">
            Onboarding draft
          </Badge>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-4xl">
            Set the target role, resume shell, and job description once.
          </h2>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            This flow validates the inputs, persists them for the signed-in
            user, and prepares the coach to ask grounded follow-ups from the
            first session.
          </p>
        </section>

        <SectionShell
          step="01"
          label="Target role"
          title="Tell the coach who you are targeting."
          description="This determines the interview style, tone, and which domains deserve the most pressure-testing."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Role title</span>
              <Input
                name="roleTitle"
                defaultValue={formValues.roleTitle}
                placeholder="Backend Software Engineer"
                aria-invalid={fieldErrors.roleTitle ? true : undefined}
                className={cn(
                  fieldErrors.roleTitle ? "border-rose-300 ring-rose-200" : "",
                )}
              />
              <FieldError message={fieldErrors.roleTitle} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Seniority</span>
              <Select name="seniority" defaultValue={formValues.seniority}>
                <SelectTrigger
                  aria-invalid={fieldErrors.seniority ? true : undefined}
                  className={cn(
                    fieldErrors.seniority ? "border-rose-300 ring-rose-200" : "",
                  )}
                >
                  <SelectValue placeholder="Select a level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="mid-level">Mid-level</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.seniority} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Company type</span>
              <Select name="companyType" defaultValue={formValues.companyType}>
                <SelectTrigger
                  aria-invalid={fieldErrors.companyType ? true : undefined}
                  className={cn(
                    fieldErrors.companyType ? "border-rose-300 ring-rose-200" : "",
                  )}
                >
                  <SelectValue placeholder="Select the company shape" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="scale-up">Scale-up</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="product-led">Product-led</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
              <FieldError message={fieldErrors.companyType} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Focus areas</span>
              <Input
                name="focusAreas"
                defaultValue={formValues.focusAreas}
                placeholder="APIs, ownership, reliability"
                aria-invalid={fieldErrors.focusAreas ? true : undefined}
                className={cn(
                  fieldErrors.focusAreas ? "border-rose-300 ring-rose-200" : "",
                )}
              />
              <FieldError message={fieldErrors.focusAreas} />
            </label>
          </div>
        </SectionShell>

        <SectionShell
          step="02"
          label="Resume shell"
          title="Upload a file or paste the resume summary."
          description="The app only needs metadata for now. The file shell and pasted notes are enough to ground the interviewer."
        >
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Resume file</span>
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
                <FileUp className="size-4 text-slate-500" />
                <Input
                  name="resumeFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md"
                  aria-invalid={fieldErrors.resumeFile ? true : undefined}
                  className="border-0 bg-transparent p-0 shadow-none file:mr-3 file:rounded-full file:border-0 file:bg-slate-950 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white"
                />
              </div>
              <FieldError message={fieldErrors.resumeFile} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">
                Resume notes or pasted summary
              </span>
              <Textarea
                name="resumeNotes"
                defaultValue={formValues.resumeNotes}
                placeholder="Paste a compact resume summary or bullet points here."
                className="min-h-32"
                aria-invalid={fieldErrors.resumeNotes ? true : undefined}
              />
              <FieldError message={fieldErrors.resumeNotes} />
            </label>
            <p className="text-sm leading-6 text-slate-500">
              Supported shell formats: PDF, DOCX, TXT, and Markdown. If no file
              is available, pasted notes still produce a usable interview draft.
            </p>
          </div>
        </SectionShell>

        <SectionShell
          step="03"
          label="Job intake"
          title="Paste the target job description."
          description="The coach uses this to shape follow-ups around the responsibilities and tradeoffs that matter most."
        >
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Company name</span>
                <Input
                  name="companyName"
                  defaultValue={formValues.companyName}
                  placeholder="Northstar"
                  aria-invalid={fieldErrors.companyName ? true : undefined}
                  className={cn(
                    fieldErrors.companyName ? "border-rose-300 ring-rose-200" : "",
                  )}
                />
                <FieldError message={fieldErrors.companyName} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Job title</span>
                <Input
                  name="jobTitle"
                  defaultValue={formValues.jobTitle}
                  placeholder="Software Engineer"
                  aria-invalid={fieldErrors.jobTitle ? true : undefined}
                  className={cn(
                    fieldErrors.jobTitle ? "border-rose-300 ring-rose-200" : "",
                  )}
                />
                <FieldError message={fieldErrors.jobTitle} />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Job URL</span>
              <Input
                name="jobUrl"
                defaultValue={formValues.jobUrl}
                placeholder="https://example.com/jobs/backend-engineer"
                aria-invalid={fieldErrors.jobUrl ? true : undefined}
                className={cn(
                  fieldErrors.jobUrl ? "border-rose-300 ring-rose-200" : "",
                )}
              />
              <FieldError message={fieldErrors.jobUrl} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-700">Job description</span>
              <Textarea
                name="jobDescription"
                defaultValue={formValues.jobDescription}
                placeholder="Paste the full job description here."
                className={cn(
                  "min-h-40",
                  fieldErrors.jobDescription ? "border-rose-300 ring-rose-200" : "",
                )}
                aria-invalid={fieldErrors.jobDescription ? true : undefined}
              />
              <FieldError message={fieldErrors.jobDescription} />
            </label>
          </div>
        </SectionShell>

        <Card className="border-slate-200/70 bg-white/85">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Mock-safe action
              </p>
              <p className="text-base text-slate-700">
                The submit action validates the draft, persists it for the
                authenticated user, and refreshes the workspace data model.
              </p>
            </div>
            <Button
              type="submit"
              disabled={pending}
              className="h-11 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
            >
              Save onboarding draft
              <ArrowRight className="size-4" />
            </Button>
          </CardContent>
        </Card>

        <div
          aria-live="polite"
          className="rounded-2xl border border-slate-200/70 bg-white/85 p-4 text-sm leading-6 text-slate-700 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.35)]"
        >
          {pending ? "Saving draft..." : currentState.message}
        </div>
      </form>

      <div className="lg:pt-16">
        <SummaryPanel state={currentState} pending={pending} />
        <Card className="mt-6 border-slate-200/70 bg-white/85">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="size-4 text-[#1638d4]" />
              Why this stands out
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-slate-600">
            <p>All validation is local and deterministic, so the UX is safe to demo.</p>
            <Separator />
            <p>The summary panel still updates from the server action state, but the saved data now hydrates the authenticated workspace and interview routes.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
