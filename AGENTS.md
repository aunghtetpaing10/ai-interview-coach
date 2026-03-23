<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. Read the relevant guide in
`node_modules/next/dist/docs/` before changing framework-level APIs,
conventions, or file structure.
<!-- END:nextjs-agent-rules -->

# AI Interview Coach Agent Guide

## Project Summary

- Product: portfolio-grade AI interview coach for software candidates
- Stack: Next.js App Router, React 19, TypeScript, Tailwind v4, `shadcn/ui`
- AI integrations: OpenAI Realtime + Responses API
- Data/ops integrations: Supabase, Drizzle, Inngest, Upstash, PostHog, Sentry
- UX posture: polished mock/demo experience first, real integrations second

## Current App Surface

- `/`: marketing landing page
- `/dashboard`: mock candidate dashboard
- `/onboarding`: role, resume, and job-description intake flow
- `/sign-in` and `/sign-up`: auth entry points
- `/workspace`: protected candidate shell
- `/interview`: live interview workspace with reducer-driven session state
- `/reports` and `/reports/[reportId]`: scoring/reporting views
- `/progress`: progress and observability dashboard
- `/api/health`: health check route

## Important Directories

- `app/`: routes, layouts, and server actions
- `components/`: UI primitives plus product-specific feature components
- `lib/auth/`: auth forms, redirects, and workspace-session helpers
- `lib/intake/`: onboarding parsing, summaries, and validation
- `lib/interview-session/`: session reducer, fixtures, and mode presets
- `lib/reporting/`: scorecard/report view models
- `lib/analytics/`, `lib/observability/`, `lib/rate-limit/`: production wrappers
- `lib/supabase/`: browser/server Supabase client helpers
- `db/`: typed schema and seed data
- `tests/`: unit, component, action, and e2e coverage

## Workflow Expectations

- Keep `main` green. Use short-lived branches and PRs for changes.
- Before making code changes, create and switch to a new short-lived branch for
  the feature or cohesive task unless the user explicitly asks to stay on the
  current branch.
- Default branch naming should stay descriptive and scoped:
  `codex/<task-scope>` for the main worker and
  `codex/<task-scope>-<responsibility>` for delegated or parallel agent work.
- When multiple agents work in parallel, each agent must use its own branch and
  own a clearly scoped responsibility or file set. Do not mix multiple agents'
  feature work on the same branch.
- Make a clean git commit for each completed feature or related task once the
  relevant checks for that scope pass. Keep commits focused and do not mix
  unrelated changes in the same commit.
- If the worktree already contains unrelated user changes, do not include them
  in the branch commit. Work around them or ask before proceeding if isolation
  is not possible.
- Prefer tests-first changes for reducers, parsers, validation, and server helpers.
- Make small commits with a clear scope. Avoid broad refactors unless required.
- Preserve the current `shadcn/ui` base and project visual language.

## Testing And CI

- Local checks:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`
- CI workflow: `.github/workflows/ci.yml`
- CI currently runs:
  - Node 20
  - `npm ci`
  - lint, typecheck, unit tests, Playwright smoke

## Dependency And Lockfile Notes

- Keep `package-lock.json` compatible with the CI environment.
- If you change dependencies, verify `npm ci` before pushing.
- If CI reports missing optional dependency entries from the lockfile, verify with:
  - `npx npm@10.9.2 ci --os=linux --cpu=x64`
- Do not hand-edit `package-lock.json`.

## Auth And Supabase Notes

- Demo mode is intentional:
  - if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset,
    `/workspace` falls back to a deterministic demo user instead of redirecting
- Auth actions still require Supabase config to create real sessions
- `createSupabaseServerClient()` does not write cookies by default
- Only call `createSupabaseServerClient({ writeCookies: true })` from a Server
  Action or Route Handler that is allowed to mutate cookies

## Environment Notes

- Environment parsing lives in `lib/env.ts`
- Example variables live in `.env.example`
- Important optional integrations:
  - Supabase
  - OpenAI
  - Upstash
  - PostHog
  - Sentry

## Implementation Notes

- Interview session behavior is reducer-driven and must stay deterministic
- Prevent duplicate live-session starts while status is `connecting` or `live`
- Reporting, progress, and onboarding screens currently lean on typed fixtures
  and mock/demo data where full backend integration is not wired yet
