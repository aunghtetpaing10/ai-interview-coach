import { NextResponse } from "next/server";
import type { RateLimitEvaluation } from "@/lib/rate-limit/upstash";

export function buildRateLimitResponse(evaluation: RateLimitEvaluation) {
  return NextResponse.json(
    {
      error: {
        code: "rate_limited",
        message: "Rate limit exceeded. Try again later.",
        details: {
          retryAfterSeconds: evaluation.retryAfterSeconds,
          resetAt: new Date(evaluation.reset).toISOString(),
          policy: evaluation.policy,
          mode: evaluation.mode,
        },
      },
    },
    {
      status: 429,
      headers: evaluation.headers,
    },
  );
}
