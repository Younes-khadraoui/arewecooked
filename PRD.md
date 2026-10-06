# Product Requirements Document & Engineering Brief: AreWeCookedYet.com

**Role Assignment:** You are operating as the Lead Full-Stack Architect and Engineering Lead for this project.
**Objective:** Architect and deploy **AreWeCookedYet.com**, an automated, curated daily intelligence dashboard tracking AI advancements and their impact on software engineering. The platform requires a secure moderation portal and a public-facing editorial feed.

Your deliverables must prioritize architectural cleanliness, strict type safety, performant UI/UX, and high backend resiliency. Functional minimalism is preferred over feature bloat.

---

## Phase 1: Project Initiation & Requirements Gathering (Execution Lock)

You must operate in a strict, phased execution model. **Do not generate application code in your initial response.**

**Step 1: Technical Scoping**
Before initiating the build, provide a numbered list of targeted scoping questions for the Product Manager. These must be formatted for concise "Yes/No" or multiple-choice responses regarding:
1. Framework preferences (e.g., Next.js App Router vs. SvelteKit).
2. Preferred LLM provider for the daily summarization pipeline.
3. Design system parameters (color palette, typography, component library).
4. Authentication protocol for the admin portal.
*Await responses to these queries before proceeding.*

**Step 2: Core Documentation Deliverables**
Following the scoping phase, generate the following documentation artifacts:
1. `WORKFLOW.md`: A comprehensive, feature-by-feature implementation checklist utilizing standard markdown formatting. This will serve as our state tracker.
2. `DECISIONS_AND_ALTERNATIVES.md`: A single architectural decision record (ADR). For every major stack component (Frontend, Database, Ingestion, Authentication), document:
   - The selected technology.
   - Alternatives evaluated.
   - Rationale for rejection (assessed against cost, latency, and maintenance overhead).
3. `DESIGN_SYSTEM.md`: A local design specification outlining typography, spacing variables, component structures, and established UI patterns.

---

## Phase 2: Architectural Guidelines & Infrastructure Constraints

The infrastructure is constrained to a **zero-overhead, serverless architecture**.

*   **Application Framework:** Next.js (App Router) or SvelteKit.
*   **Deployment & Edge:** Netlify (selected).
*   **Database & Authentication:** Supabase (PostgreSQL, Row Level Security, GoTrue Auth).
*   **Automation:** GitHub Actions configured with a strict `cron: '0 4 * * *'` schedule (executing exactly once every 24 hours).
*   **AI Integration:** A single daily batched API call utilizing structured JSON outputs to guarantee schema compliance prior to database insertion.

---

## Phase 3: Data Ingestion Pipeline

The ingestion service is mission-critical. It must be highly resilient, idempotent, and executed strictly as a daily batch process to minimize operational costs.

### 1. Target Data Sources
The service must aggregate RSS, Atom, and API feeds from:
*   **Primary Corporate Labs:** OpenAI RSS, Anthropic Blog, Google DeepMind Blog, Meta AI, Mistral.
*   **Developer Aggregators:** Hacker News Algolia API (Parameters: `tags=story`, `points>150`, query: `AI OR LLM OR Machine Learning`, timeframe: last 24h), Reddit (`r/MachineLearning`, `r/LocalLLaMA` top 24h).
*   **Academic & Research:** Hugging Face Daily Papers API, arXiv `cs.AI` & `cs.SE` RSS feeds.

### 2. Processing Specifications
1.  **Extraction:** Retrieve URIs and metadata for the preceding 24-hour window.
2.  **Deduplication:** Verify against the database utilizing a unique index on `original_url`. Cluster redundant coverage of single events.
3.  **LLM Batch Processing:** Transmit the sanitized payload to the LLM with strict prompt constraints to yield:
    *   A standardized, technical headline.
    *   A concise, two-sentence technical summary and two key takeaways.
4.  **Database Write:** Insert all validated records with the default status `pending`.

### 3. Historic Backfill Initialization
Develop a dedicated utility (`npm run seed`) to ingest historical data covering the previous 30 days. This is a deployment prerequisite to populate the initial UI state.

---

## Phase 4: Content Management & Admin Moderation

The `/admin` route requires strict access controls and must be optimized for rapid, daily triage.

*   **Review Queue:** Display records with `status: 'pending'` in a card-based interface.
*   **State Management:** Permit binary actions: **[Approve]** (`status: 'published'`) or **[Reject]** (`status: 'rejected'`).
*   **Mutation Capabilities:** Enable inline editing of the title, source URL, and summary prior to or post-publication.
*   **Record Deletion:** Support both logical (soft) and physical (hard) deletion of published entries.
*   **Keyboard Navigation:** Implement global event listeners for rapid triage (e.g., `J/K` for traversal, `A` for approval, `X` for rejection).

---

## Phase 5: Telemetry & System Health Monitoring

Silent failures are unacceptable. The administrative interface must feature a robust **System Health** module:
1.  **Execution Logs:** The daily automation must write telemetry to a `cron_logs` table (Timestamp, Feeds Parsed, Anomalies, LLM Token Consumption, Final Status).
2.  **Error Handling:** Surface network or API failures (e.g., HTTP 503s from target feeds, LLM timeouts) via human-readable diagnostic badges in the UI.
3.  **Manual Invocation:** Provide a secure webhook trigger within the admin panel to force execute the batch process for diagnostic purposes.

---

## Phase 6: User Experience & Interface Specifications

The design language must reflect a premium, engineering-focused editorial product. Benchmark against platforms like Linear or Vercel.

*   **Design Variables:** Standardize on highly legible sans-serif typography (e.g., Inter, Geist) and enforce a strict Dark Mode theme with high-contrast structural borders.
*   **Performance SLAs:** The public feed must utilize Server-Side Rendering (SSR) or Incremental Static Regeneration (ISR) to eliminate layout shift and client-side loading states.
*   **Component Architecture:** Utilize a headless, accessible component library (e.g., Radix) styled strictly via Tailwind CSS utility classes.

---

## Execution Directives & Continuous Alignment Rule

**Continuous Alignment Rule:** Throughout the entire development lifecycle, whenever a feature, architecture component, or integration presents multiple viable alternatives (e.g., choosing an authentication provider, selecting a database ORM, or designing a complex UI pattern), **you must pause execution**. Present the available options to the Product Manager, outline the technical trade-offs for each, and explicitly ask for a decision before writing any associated code.

Confirm receipt and comprehension of this PRD.
1. Output your Phase 1 scoping queries.
2. Await my authorization before proceeding.
3. tell me before commiting to any code generation or implementation tasks and wait untill u finish lot of features to commit

**DO NOT output any functional application code until the scoping phase is complete and the core documentation artifacts are approved.**