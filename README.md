# AI Interview Coach

A production-style AI interview coach for software candidates. The app is being
built to demonstrate a real vertical AI product: live mock interviews,
grounded follow-up questions, evidence-linked scoring, progress analytics, and
production-minded observability.

## Product goals

- Voice-first mock interviews with text fallback
- Resume and job-description grounded follow-up questions
- Rubric-based scorecards with transcript citations
- Progress tracking across behavioral, resume, project, and system design
  practice
- Portfolio-grade engineering workflow with TDD, CI, and feature branches

## Stack

- Next.js App Router, React 19, TypeScript, Tailwind v4
- `shadcn/ui` component system
- OpenAI Realtime + Responses API
- Supabase Auth, Postgres, Storage, and `pgvector`
- Inngest for async workflows
- Upstash Redis for quotas and rate limits
- Sentry and PostHog for observability

## Local development

1. Copy `.env.example` to `.env.local`.
2. Install dependencies with `npm install`.
3. Start the app with `npm run dev`.

## Scripts

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run format`
- `npm run db:generate`
- `npm run db:push`

## Engineering workflow

- `main` is reserved for reviewed, green builds.
- Feature work should happen on `codex/*` branches.
- Each feature branch should use small, readable commits.
- Prefer tests-first changes for domain logic, API contracts, and UI behavior.

## Delivery slices

- `codex/bootstrap-platform`
- `codex/auth-data-foundation`
- `codex/intake-profile-flow`
- `codex/live-interview-session`
- `codex/reporting-evals`
- `codex/progress-observability`
