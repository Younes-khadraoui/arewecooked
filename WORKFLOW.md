# AreWeCookedYet.com Workflow

## Scope and Execution Model

This workflow reflects the Phase 1 scoping outcome for the MVP: a premium editorial AI-news dashboard with no LLM-generated summarization in v1. The platform will focus on reliable ingestion, editorial review, moderation, and a polished public-facing feed.

Project goals:
- Build a performant public-facing editorial feed for curated AI and software-engineering developments.
- Support an admin moderation portal for triage and approval workflows.
- Maintain a resilient, serverless daily ingestion cycle powered by GitHub Actions.
- Stay within a zero-cost/free-tier architecture and strict operational discipline.

---

## Milestone 0: Alignment and Technical Setup

### Checklist
- [x] Confirm final stack choice: Next.js App Router with Tailwind CSS
- [x] Confirm design direction: premium dark+light editorial experience with warm coffee-inspired palette
- [x] Confirm that admin-only authentication is in scope for the moderation portal
- [x] Confirm that LLM-generated summaries are intentionally deferred from the initial MVP
- [ ] Create production-ready environment variables and Supabase project shell
- [ ] Set repository conventions: ESLint, TypeScript strict mode, Prettier, CI checks

### Deliverables
- Local project bootstrapping in Next.js App Router
- Deployment target selected: Netlify
- Supabase project initialized with Postgres + Auth + RLS
- GitHub Actions baseline workflow prepared for scheduled automation

---

## Milestone 1: Foundation and Design System

### Checklist
- [x] Initialize Next.js App Router project
- [x] Configure TypeScript strict settings and project structure
- [x] Install and configure Tailwind CSS
- [x] Add a professional component layer using shadcn/ui with Radix primitives
- [x] Install Supabase browser/server client libraries and generate typed client helpers
- [ ] Define local design tokens for spacing, color, radius, border, typography, and motion
- [x] Implement both light and dark theme variants
- [x] Build a premium shell with navigation, content framing, and editorial layout patterns
- [x] Build a responsive layout for desktop and mobile reading experiences

### Design expectations
- Editorial layout inspired by Linear/Vercel but grounded in warm neutral, coffee-toned surfaces
- High-contrast typography and clear information hierarchy
- Consistent spacing scale and generous whitespace
- Minimal noise with strong component boundaries and readable density

---

## Milestone 2: Database and Content Model

### Checklist
- [x] Define the core `entries` table schema in a Supabase migration
- [x] Define moderation and status fields (`pending`, `published`, `rejected`)
- [x] Define source metadata fields (`source_name`, `original_url`, `source_excerpt`, `published_at`, `feed_kind`)
- [x] Add deduplication constraint and query indexes for `original_url` and review/publication queues
- [x] Add moderation metadata (`reviewed_by`, `reviewed_at`, `review_notes`, `deleted_at`)
- [x] Add `cron_logs` table for ingestion diagnostics
- [x] Use `cron_logs` as the ingestion run history; no separate `feed_runs` table is needed
- [x] Add RLS policies for read-only public access and admin-only write paths
- [x] Add strict database constraints for statuses, source kinds, timestamps, and log counts
- [ ] Apply migration to Supabase and verify access using public, admin, and service-role credentials

### Proposed content model
- `id` (UUID or bigint primary key)
- `title`
- `source_name`
- `original_url` (canonical source article URL; unique)
- `source_excerpt` (optional source-provided description, never LLM-generated)
- `published_at`
- `feed_kind`
- `status` (`pending`, `published`, or `rejected`)
- `created_at`
- `updated_at`
- `deleted_at`
- `reviewed_by`, `reviewed_at`, `review_notes`

---

## Milestone 3: Public Feed Experience

### Checklist
- [ ] Build the public homepage list view
- [ ] Sort entries chronologically by publication time or freshness signal
- [ ] Render a minimal but premium article card style
- [ ] Display original titles, source metadata, optional source-provided excerpts, and dates clearly
- [ ] Support article detail pages for expanded reading
- [ ] Use SSR/ISR-friendly rendering to avoid client-side loading jank
- [ ] Ensure semantic HTML and accessibility compliance across public pages

### Public UX principles
- Fast first render, no loading skeletons on initial page load
- Heavy emphasis on readability and trust signals
- Clear content segmentation between “news”, “signals”, and “source references”

---

## Milestone 4: Ingestion Pipeline (Daily Batch)

### Checklist
- [ ] Define target feeds and ingestion sources
- [ ] Create feed fetcher abstraction for RSS, Atom, and JSON endpoints
- [ ] Normalize metadata into a single internal content shape
- [ ] Deduplicate against the database using `original_url`
- [ ] Filter out non-relevant low-quality entries
- [ ] Enqueue or directly insert valid rows with default `status: 'pending'`
- [ ] Log batch execution details to `cron_logs`
- [ ] Handle HTTP failures and rate-limit anomalies with human-readable diagnostics
- [ ] Gate the automation behind a strict `cron: '0 4 * * *'` schedule
- [ ] Add a manual diagnostic trigger path for on-demand execution

### v1 ingestion sources
- OpenAI Blog
- Anthropic Blog
- Google DeepMind Blog
- Meta AI
- Mistral
- Hacker News Algolia (AI‑related stories, high-score filter)
- Reddit r/MachineLearning and r/LocalLLaMA (top 24h)
- Hugging Face Daily Papers
- arXiv CS.AI, CS.SE RSS feeds

### Operational requirements
- Daily batch only; no realtime polling or daemon processes
- Idempotent ingestion with a canonical content signature
- Failures must surface clear logs and anomalies rather than silently succeed
- Each run should be inspectable in admin telemetry

---

## Milestone 5: Admin Moderation Portal

### Checklist
- [x] Implement secure `/admin` route shell and email/password sign-in page
- [x] Add role-protected admin session flow using Supabase Auth and trusted `app_metadata.role`
- [x] Provide a server-side-only utility to grant admin metadata to an existing account
- [x] Build a queue of pending items with card-based review layout
- [x] Add approve / reject actions with binary state transitions
- [x] Allow inline editing of title and source URL for pending and published entries
- [x] Support confirmed soft-delete and hard-delete operations for published records
- [x] Add keyboard shortcuts: `J/K` for navigation, `A` for approve, `X` for reject
- [x] Add pending/rejected status filters, audit view, and queue empty/error states
- [ ] Expose admin reliability logs and ingestion run status

### Moderation behavior
- Default ingestion items are inserted as `pending`
- Only explicitly approved items become public
- Rejected items remain visible to admins for auditability and cleanup
- Deletions must preserve or document data handling policies based on product expectations

---

## Milestone 6: Telemetry, Health, and Diagnostics

### Checklist
- [ ] Define telemetry schema and log fields for `cron_logs`
- [ ] Track parsed feed counts, anomalies, network issues, and final status
- [ ] Add a visible system health surface in the admin panel
- [ ] Provide badges for failed feed fetches, retries, and ingestion errors
- [ ] Add manual invocation webhook or admin action to trigger the daily job for diagnostics
- [ ] Add a run history screen for recent execution health

### Logged telemetry fields
- Timestamp
- Feeds parsed
- Feed anomalies or partial failures
- Network or API failure labels (e.g., HTTP 503, timeout, malformed payload)
- Final run status
- Optional field: token or API cost metrics if present in v1

---

## Milestone 7: Resilience, Security, and Hardening

### Checklist
- [ ] Enforce RLS across sensitive admin tables
- [ ] Restrict admin routes to authenticated sessions only
- [ ] Handle upstream feed outages with graceful failover and logging
- [ ] Validate all data inserted into Postgres against safe shape requirements
- [ ] Add rate-limit awareness and retry policy for external fetches
- [ ] Add guardrails around malformed or malicious source content
- [ ] Ensure no server-side secrets are exposed to the public frontend
- [ ] Run linting, type-checking, and smoke tests before deployment

---

## Milestone 8: Launch Readiness

### Checklist
- [ ] Seed historical content for the last 30 days via a dedicated utility command (`npm run seed`)
- [ ] Validate feed quality and dedupe behavior against historical data
- [ ] Confirm the public site renders correctly in light and dark modes
- [ ] Validate admin moderation flows and keyboard interactions
- [ ] Validate Netlify deployment and Supabase connectivity
- [ ] Confirm cron schedule is active and executed once per day at 04:00 UTC
- [ ] Perform a final production smoke test on key public and admin routes

---

## Delivery Freeze

The implementation should not proceed to database or UI coding before the above checklist is accepted. The project remains intentionally staged and should be validated at each milestone before the next one is started.
