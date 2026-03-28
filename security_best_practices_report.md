# Production Codebase Review

## Executive Summary

This is a modular monolith that is directionally correct for the product stage: Next.js App Router at the edge, application services in `lib/`, Drizzle/Postgres for OLTP, and Inngest for async report generation. The strongest parts are the explicit module boundaries, good use of runtime validation, and thoughtful transaction handling in the session/report write paths.

The biggest problems are not “style” problems. They are hidden write-side effects during page rendering, a very chatty data-access pattern that will not scale cleanly, missing abuse controls on expensive endpoints, and a demo runtime that has leaked into build/runtime behavior hard enough to break local builds. Security is acceptable for a demo, but not production-grade yet: tenant isolation is enforced only in application code, not in the database, and the app has no meaningful rate limiting or CSRF-hardening story in its request layer.

## Findings

### Critical / High

**F-01 | High | GET render path mutates persistent state**

- Location: `app/interview/page.tsx:136-160`
- Evidence: the page render calls `sessionService.createSession(...)` and may immediately call `sessionService.appendTranscriptTurns(...)`.
- Why it matters: rendering a page should not create rows. This makes route prefetch, crawlers, accidental refreshes, and retries capable of generating draft sessions and transcript state.
- What could go wrong: draft-session pollution, difficult-to-reason-about retries, and hidden writes during build/demo flows.
- Fix: move session creation and transcript seeding behind an explicit POST/action initiated by the user.
- Effort: Moderate

**F-02 | High | Dashboard/report/progress reads are excessively chatty**

- Location: `app/dashboard/page.tsx:56-80`, `lib/data/database-repository.ts:45-77`, `lib/report-service/database-store.ts:147-276`, `lib/progress-service/database-store.ts:23-90`
- Evidence: the dashboard composes multiple services that each fan out into many queries; `loadGenerationContext()` alone performs a long sequence of point queries.
- Why it matters: this is fine at tiny scale and becomes expensive fast under concurrent traffic.
- What could go wrong: high DB QPS, poor p95 latency, and over-fetching on the most-visited pages.
- Fix: introduce page-specific read models that collapse these into a handful of queries, add pagination/limits, and stop loading entire histories for summary pages.
- Effort: Large

**F-03 | High | Transcript append path is O(n) and not idempotent**

- Location: `lib/session-service/database-store.ts:103-123`, `components/interview/interview-workspace.tsx:248-291`
- Evidence: each append loads all transcript turns to compute the next sequence index, then appends new rows without a client-generated idempotency key.
- Why it matters: every new turn gets slower as the transcript grows, and network retries can duplicate turns.
- What could go wrong: duplicate transcript rows, corrupted reports, and lock contention on active sessions.
- Fix: store a monotonic next-sequence counter on the session row or select `max(sequence_index)` only, and require an idempotency key or deterministic client batch ID.
- Effort: Moderate

**F-04 | High | No rate limiting on expensive authenticated endpoints**

- Location: `app/api/realtime/session/route.ts:19-68`, `app/api/interview/sessions/[sessionId]/report/route.ts:52-75`, `app/(auth)/actions.ts:18-126`, `lib/rate-limit/upstash.ts:56-87`
- Evidence: expensive endpoints mint OpenAI realtime secrets and enqueue report-generation jobs, but the Upstash limiter exists only as telemetry and is not applied.
- Why it matters: authenticated abuse is still abuse, especially when it burns OpenAI credits or background-worker capacity.
- What could go wrong: cost spikes, queue saturation, account abuse, and easy denial-of-wallet attacks.
- Fix: enforce per-user and per-IP limits on auth, realtime-session creation, transcript append, and report generation.
- Effort: Moderate

**F-05 | High | Tenant isolation is application-only; the database does not enforce it**

- Location: `db/schema.ts`, `db/migrations/*.sql`
- Evidence: tables are keyed by `user_id`, but there are no RLS policies or DB-level tenant-isolation protections in the schema/migrations.
- Why it matters: one missed `userId` predicate in future code exposes cross-user data.
- What could go wrong: cross-tenant reads/writes if a future handler or query is buggy.
- Fix: add RLS where Supabase-managed access is possible, or at minimum add stronger DB constraints and isolate DB roles by capability.
- Effort: Large

**F-06 | High | The report artifact is not immutable; parts are recomputed on read**

- Location: `lib/report-service/database-store.ts:49-69`, `lib/report-service/database-store.ts:72-95`, `lib/report-service/database-store.ts:279-339`
- Evidence: `saveGeneratedReport()` persists practice-plan data, but `getReportById()` ignores the stored plan and regenerates it. Report overview also recomputes summary data from scorecard instead of treating stored evaluation output as canonical.
- Why it matters: historical reports can drift when scoring or practice-plan logic changes.
- What could go wrong: users reopen an old report and see different recommendations than the ones originally generated.
- Fix: persist the full evaluated artifact and read it back verbatim; derive secondary views from immutable stored data, not fresh code paths.
- Effort: Moderate

**F-07 | High | Demo runtime state leaks into build/runtime behavior and breaks builds**

- Location: `lib/workspace/demo-runtime/state.ts:235-237`, `lib/workspace/demo-runtime/state.ts:435-468`, `lib/workspace/demo-runtime/state.ts:476-496`
- Evidence: local `next build` with `E2E_DEMO_MODE=1` failed because `.next/cache/e2e-demo-runtime.json` lacked `reportJobsBySessionId`, and `deserializeState()` assumes that key exists.
- Why it matters: build correctness depends on mutable cache state with no schema versioning or backward compatibility.
- What could go wrong: non-reproducible builds, environment-specific failures, and hard-to-debug demo regressions.
- Fix: version the serialized demo-state format, default missing keys safely, and stop using `.next/cache` as a runtime data store for server-rendered pages.
- Effort: Moderate

### Medium

**F-08 | Medium | API contracts are inconsistent and semantically confusing**

- Location: `app/api/interview/sessions/route.ts`, `app/api/reports/route.ts`, `app/api/reports/[id]/route.ts`, `lib/report-service/report-service.ts:185-201`
- Evidence: some routes return bare resources, others wrap responses, error bodies are inconsistent, and `toCompletedReportGenerationState()` sets `jobId` to the `reportId`.
- Why it matters: clients become brittle when contracts are inconsistent or misleading.
- What could go wrong: downstream consumers treat a report ID as a job ID, and future API consumers need route-specific parsing logic.
- Fix: standardize envelope/error formats and make report-generation state fields semantically accurate.
- Effort: Moderate

**F-09 | Medium | Pages and APIs fetch far more data than they need**

- Location: `lib/report-service/database-store.ts:147-169`, `lib/progress-service/database-store.ts:36-71`, `lib/data/database-repository.ts:45-77`
- Evidence: report overviews select full `feedback_reports` rows; progress reads every transcript-turn ID just to count turns; workspace snapshot loads full question banks and rubrics just to compute counts and a 3-item preview.
- Why it matters: over-fetching wastes CPU, memory, and network bandwidth.
- What could go wrong: poor scalability as report JSONB blobs and transcript histories grow.
- Fix: select only needed columns, aggregate in SQL, and split “count/preview” queries from “full detail” queries.
- Effort: Moderate

**F-10 | Medium | DB integrity constraints do not enforce the invariants the app assumes**

- Location: `db/schema.ts:45-58`, `db/schema.ts:79-98`, `db/schema.ts:118-159`
- Evidence: the app assumes one active target role per user and consistent `user_id` ↔ `target_role_id` ownership, but the database does not enforce those relationships.
- Why it matters: concurrent writes or future code paths can create ambiguous or cross-user relational state.
- What could go wrong: multiple active roles, duplicate job targets, or a session linked to another user’s target role.
- Fix: add partial unique indexes and composite constraints/FKs that encode these invariants.
- Effort: Moderate

**F-11 | Medium | Resume upload lifecycle will accumulate stale rows and files**

- Location: `lib/intake/persistence.ts:151-208`, `lib/intake/persistence.ts:326-352`, `lib/intake/persistence.ts:355-363`
- Evidence: every onboarding save inserts a new `resume_assets` row; old storage objects are only cleaned up on transaction failure, not on replacement.
- Why it matters: storage and DB rows will grow indefinitely for active users.
- What could go wrong: orphaned files, rising storage cost, and confusing audit state.
- Fix: make resume assets replace/update the active asset, delete superseded files, and provision the bucket outside the request path.
- Effort: Moderate

**F-12 | Medium | Upload validation is metadata-driven and the service-role blast radius is larger than necessary**

- Location: `components/intake/onboarding-flow.tsx:241-247`, `lib/intake/persistence.ts:160-197`
- Evidence: client-side `accept` allows `.doc`, preview logic treats `.doc` as supported, but the storage allowlist only includes `docx`; upload checks rely on filename/MIME metadata, and the request path uses the Supabase service-role key to create/manage the bucket.
- Why it matters: validation is inconsistent and bucket administration should not happen on the hot path.
- What could go wrong: confusing user failures, mislabeled files getting farther than they should, and unnecessary privileged operations in user-facing code.
- Fix: align accepted formats, add server-side size/type validation, and pre-provision the bucket with least-privilege access patterns.
- Effort: Moderate

**F-13 | Medium | Observability is mostly aspirational**

- Location: `lib/analytics/posthog.ts`, `lib/observability/sentry.ts`, `app/global-error.tsx:12-15`, `app/api/health/route.ts:3-8`
- Evidence: telemetry helpers exist but are not wired into request handlers or background jobs; the global error boundary only logs to `console.error`; health checks do not verify DB/queue/provider readiness.
- Why it matters: production incidents will be hard to detect, correlate, and triage.
- What could go wrong: silent failures in report generation, auth, or OpenAI integrations.
- Fix: wire Sentry/PostHog into server routes/jobs, add request/job correlation IDs, and expand `/api/health` into dependency-aware readiness checks.
- Effort: Moderate

**F-14 | Medium | Test coverage is strong on pure logic and weak on the real data path**

- Location: `vitest.config.mjs:18-28`, latest `npm run test` coverage output
- Evidence: tests pass, but coverage is effectively zero for `lib/db/client.ts`, `lib/report-service/database-store.ts`, `lib/progress-service/database-store.ts`, and the Inngest routes/functions.
- Why it matters: the most failure-prone code is the least exercised.
- What could go wrong: regressions in real SQL queries, transactions, and background jobs slip through despite a green suite.
- Fix: add integration tests against ephemeral Postgres and job-processing tests against the real report store.
- Effort: Moderate

**F-15 | Medium | Full transcript/profile payloads are sent to OpenAI with no budget controls**

- Location: `lib/openai/report-evaluator.ts:249-307`
- Evidence: the report evaluator serializes the entire transcript, profile, and role context into a single Responses call.
- Why it matters: latency and cost will scale with transcript length.
- What could go wrong: token-limit failures, expensive evaluations, and slow report generation for longer interviews.
- Fix: introduce transcript compaction/summarization, size budgets, and explicit truncation policy before model calls.
- Effort: Moderate to Large

### Low

**F-16 | Low | Production readiness has small but real config/drift issues**

- Location: `middleware.ts:69-73`, `app/global-error.tsx:21-24`, `.env.example:39-44`, `lib/observability/sentry.ts:19-28`
- Evidence: `middleware` is deprecated in Next 16, the UI claims “we have been notified” even though Sentry is not wired, and `.env.example` omits some env vars used in code (`SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`, `DB_MAX_CONNECTIONS`, `NEXT_PUBLIC_POSTHOG_*`).
- Why it matters: this is small individually, but it creates friction and false confidence.
- What could go wrong: confusing setup, misleading incident messaging, and lingering framework warnings.
- Fix: rename middleware to proxy, align docs/examples with real env usage, and remove misleading error-copy.
- Effort: Quick

## What Is Good

- The architecture is appropriately a modular monolith for the current product scope.
- `lib/` is split by concern in a way that a growing team can work with.
- Input validation is consistently done with Zod on most request boundaries.
- Session and report generation writes use transactions and row-level locking where it matters.
- The auth redirect path handling is better than average and explicitly defends against open redirects.
- Unit and Playwright smoke coverage are both present, and the current suites are green.

## Overall Assessment

- Architecture score: 6.5/10
- Security score: 5.5/10
- Maintainability score: 6/10
- Scalability readiness score: 4.5/10

## Three Biggest Real-World Risks

1. Hidden write-side effects and non-idempotent transcript/session flows will create data-quality issues under normal production retries and prefetch behavior.
2. The current data-access pattern will push too many queries and too much payload through Postgres/OpenAI as usage grows.
3. Abuse controls and tenant-isolation defenses are not strong enough yet for a production system handling real candidate data and paid model calls.
