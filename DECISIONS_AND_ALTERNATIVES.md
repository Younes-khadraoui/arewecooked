# Decisions and Alternatives

## ADR-001: Architecture and Implementation Decisions for AreWeCookedYet.com

- Status: Accepted for MVP definition
- Related requirement source: `PRD.md`
- Scope: Frontend, database, ingestion, authentication, and deployment assumptions

## Context

The project requires a low-cost, premium editorial intelligence platform for AI/software-engineering developments, with a public feed and an admin moderation portal. The operating constraints call for a serverless, zero-overhead deployment strategy and a strict daily batch ingestion process. In the initial MVP version we are intentionally excluding LLM-generated summarization and focusing on source ingest, moderation, and clean public presentation.

---

## 1) Frontend: Next.js App Router + Tailwind CSS + polished component layer

### Selected technology
- Next.js App Router
- Tailwind CSS
- Optional polished UI layer such as shadcn/ui or similar headless component primitives

### Alternatives evaluated
- SvelteKit
- Remix
- Astro static-first architecture
- Full custom CSS component system without a design system layer

### Rationale for rejection
- SvelteKit: strong framework, but the team and product direction favor the Next.js ecosystem for deployment simplicity and operational familiarity.
- Remix: technically sound, but adds more abstraction for a comparatively small data-heavy editorial app where Next.js App Router on Netlify is the selected fit.
- Astro: attractive for content-heavy sites, but the need for a dynamic admin portal and server-managed moderation logic makes a full App Router solution more coherent.
- Pure custom CSS system: lower setup cost initially, but higher long-term maintenance, consistency, and accessibility overhead for a premium editorial product.

### Why this is the right choice
- Best fit for Netlify deployment and server-side rendering/ISR requirements
- Strong compatibility with a mature TypeScript environment
- Easy integration with server actions, route handling, and secure admin workflows
- Scales cleanly with a small team and low operational overhead

---

## 2) Database: Supabase Postgres with RLS

### Selected technology
- Supabase PostgreSQL
- Row Level Security (RLS)
- Authentication built on Supabase GoTrue

### Alternatives evaluated
- Firebase Firestore
- PlanetScale/MySQL
- Neon Postgres without Supabase abstraction
- Self-hosted Postgres on a VPS

### Rationale for rejection
- Firebase Firestore: good for app state, but less suitable for a relational editorial workflow with strict moderation and auditability requirements.
- PlanetScale: excellent raw database performance, but the project explicitly favors the Supabase ecosystem and integrated auth so the team can move faster without managing several infrastructure layers.
- Neon Postgres without Supabase: viable, but it would require additional auth and policy layers, reducing simplicity and increasing maintenance overhead.
- Self-hosted Postgres: too operationally heavy for a zero-overhead cost constraint and a small team.

### Why this is the right choice
- Matches explicit product constraints in the PRD
- Excellent fit for CRUD-heavy moderation and admin workflows
- Efficient row-level policy enforcement for admin-only routes and public reads
- Keeps operational overhead low while offering Postgres reliability and indexing strength

---

## 3) Ingestion: GitHub Actions + daily batch fetchers

### Selected technology
- GitHub Actions
- Daily cron schedule: `0 4 * * *`
- RSS/Atom/JSON fetchers with normalization and dedupe logic
- Postgres writes on validated content only

### Alternatives evaluated
- Vercel cron jobs
- External scheduler services
- Always-on backend worker or polling service
- Real-time ingestion daemon

### Rationale for rejection
- Vercel cron jobs: possible, but GitHub Actions is simpler for a low-cost setup and is explicitly aligned with PRD constraints.
- External scheduler services: relieve some ops work, but add cost and vendor lock-in, which is contrary to the zero-overhead requirement.
- Always-on polling daemon: conflicts with the requirement to remain serverless and cost-efficient.
- Real-time ingestion: violates the architecture constraints and is unnecessary for a curated daily intelligence feed.

### Why this is the right choice
- Matches the requirement for a strict daily batching model
- Suitable for low-cost operation and easy scheduling
- Keeps data ingestion deterministic and auditable
- Simplifies retries, failures, and logs without leaving a background service running

---

## 4) Authentication: Admin-only Auth (Supabase Auth)

### Selected technology
- Supabase Auth email/password
- Admin-only protected routes gated by the trusted `app_metadata.role` claim
- Admin account creation is provisioned manually; public sign-up is disabled/out of scope
- No public user sign-in requirements for v1

### Alternatives evaluated
- Clerk
- Auth0
- Custom JWT service
- Anonymous or public admin portal access

### Rationale for rejection
- Clerk: strong product, but the PRD and stack constraints explicitly point to Supabase Auth.
- Auth0: enterprise-grade but not cost-efficient in a zero-cost/startup architecture.
- Custom JWT service: too much operational overhead and additional maintenance burden for a project of this size.
- Public admin access: unacceptable from both product and security perspectives.

### Why this is the right choice
- Fits the project’s serverless architecture and free-tier constraints
- Low setup complexity
- Good relationship with Postgres and RLS policies
- Keeps moderation more secure and operationally consistent

---

## 5) Deployment: Netlify + Supabase

### Selected technology
- Netlify for Next.js hosting, server-side rendering, and deployment previews
- Supabase for Postgres + RLS + Auth

### Alternatives evaluated
- Vercel
- Cloudflare Pages + D1 + Workers
- Self-hosted containers

### Rationale for rejection
- Vercel: a strong Next.js option, but Netlify is the selected hosting provider for this project.
- Cloudflare Pages: viable, but the project will keep hosting and Next.js runtime configuration on Netlify rather than introduce a separate platform choice.
- Self-hosted containers add operational management, which is contrary to minimal overhead goals.

### Why this is the right choice
- Matches the user’s selected deployment provider and the PRD’s supported hosting options
- Supports Next.js hosting and deployment previews
- Low system complexity and strong DX for iteration

---

## Outcome

The selected architecture deliberately favors simplicity, speed, and low cost over feature breadth. It aligns with the project’s editorial, admin-heavy, low-ops character while preserving a clear path for future enhancements such as LLM-assisted summarization after the MVP foundation is proven.
