import {
  CheckCircle2,
  CircleAlert,
  ShieldAlert,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { PostHogTelemetryStatus } from "@/lib/analytics/posthog";
import type { SentryTelemetryStatus } from "@/lib/observability/sentry";
import type { RateLimitTelemetryStatus } from "@/lib/rate-limit/upstash";

type IntegrationStatusGridProps = {
  posthog: PostHogTelemetryStatus;
  sentry: SentryTelemetryStatus;
  rateLimit: RateLimitTelemetryStatus;
  quotaUsed: number;
  quotaLimit: number;
  quotaResetAt: string;
};

const statusIcons = {
  active: CheckCircle2,
  disabled: CircleAlert,
} as const;

function StatusCard({
  title,
  status,
  detail,
    nextStep,
    IconGlyph,
    footer,
    progressValue,
  }: {
  title: string;
    status: "active" | "disabled";
    detail: string;
    nextStep: string;
    IconGlyph: LucideIcon;
    footer?: string;
    progressValue?: number;
  }) {
  const Icon = statusIcons[status];

  return (
    <Card className="border-slate-200/70 bg-white/90">
      <CardHeader className="gap-4">
        <div className="flex items-center justify-between">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <IconGlyph className="size-5" />
          </div>
          <Badge
            variant={status === "active" ? "secondary" : "outline"}
            className={status === "active" ? "bg-emerald-100 text-emerald-800" : "text-slate-600"}
          >
            <Icon className="mr-1 size-3.5" />
            {status === "active" ? "Active" : "Disabled"}
          </Badge>
        </div>
        <div className="space-y-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="leading-6 text-slate-600">{detail}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-slate-600">
        {progressValue !== undefined ? <Progress value={progressValue} className="h-2.5" /> : null}
        <p>{nextStep}</p>
        {footer ? <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">{footer}</p> : null}
      </CardContent>
    </Card>
  );
}

export function IntegrationStatusGrid({
  posthog,
  sentry,
  rateLimit,
  quotaUsed,
  quotaLimit,
  quotaResetAt,
}: IntegrationStatusGridProps) {
  const quotaValue = quotaLimit === 0 ? 0 : Math.round((quotaUsed / quotaLimit) * 100);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <StatusCard
        title="PostHog analytics"
        status={posthog.enabled ? "active" : "disabled"}
        detail={posthog.detail}
        nextStep={posthog.nextStep}
        IconGlyph={Sparkles}
        footer={posthog.host}
      />
      <StatusCard
        title="Sentry monitoring"
        status={sentry.enabled ? "active" : "disabled"}
        detail={sentry.detail}
        nextStep={sentry.nextStep}
        IconGlyph={ShieldAlert}
        footer={sentry.environment}
      />
      <Card className="border-slate-200/70 bg-white/90">
        <CardHeader className="gap-4">
          <div className="flex items-center justify-between">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <CircleAlert className="size-5" />
            </div>
            <Badge
              variant={rateLimit.enabled ? "secondary" : "outline"}
              className={rateLimit.enabled ? "bg-sky-100 text-sky-800" : "text-slate-600"}
            >
              {rateLimit.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl">Upstash rate limiting</CardTitle>
            <CardDescription className="leading-6 text-slate-600">{rateLimit.detail}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.22em] text-slate-500">
            <span>Quota usage</span>
            <span>
              {quotaUsed}/{quotaLimit}
            </span>
          </div>
          <Progress value={quotaValue} className="h-2.5" />
          <p>{rateLimit.nextStep}</p>
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
            Resets {quotaResetAt}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
