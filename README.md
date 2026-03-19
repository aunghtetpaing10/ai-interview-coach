# AI Interview Coach

AI Interview Coach is a production-style interview prep app for software
candidates. It combines onboarding, live mock interview sessions, report
generation, and progress tracking into a single polished product demo.

## Product Focus

- Voice-first mock interviews with text fallback
- Resume and job-description grounded follow-up questions
- Rubric-based scoring with transcript citations
- Progress tracking across behavioral, resume, project, and system design
  practice
- Demo-friendly UX that still shows real engineering discipline

## Stack

- Next.js App Router, React 19, TypeScript, Tailwind CSS v4
- `shadcn/ui` for the UI foundation
- OpenAI Realtime + Responses API
- Supabase Auth, Postgres, and Storage
- Drizzle for SQL tooling
- Inngest for async workflows
- Upstash Redis for quotas and rate limits
- PostHog and Sentry for analytics and observability

## Getting Started

1. Copy `.env.example` to `.env`.
2. Fill in the env vars you plan to use.
3. Install dependencies with `npm ci`.
4. Start the app with `npm run dev`.

## Scripts

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run test:e2e`
- `npm run format`
- `npm run format:write`
- `npm run db:generate`
- `npm run db:push`

## Development Notes

- `main` is protected and should stay green.
- Use short-lived feature branches and small, readable commits.
- Prefer tests-first changes for reducers, parsers, validation, and server
  helpers.
- Keep the `shadcn/ui` base and the current visual language unless you are
  deliberately changing the product theme.

## Repo Layout

- `app/`: routes, layouts, and server actions
- `components/`: UI primitives and feature components
- `lib/`: domain logic, integrations, and utility code
- `db/`: schema and seed data
- `tests/`: unit, component, and e2e coverage

## Verification

The CI workflow runs on Node 20 and executes:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npx playwright install --with-deps chromium`
- `npm run test:e2e`
