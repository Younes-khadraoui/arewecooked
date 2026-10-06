# Are We Cooked Yet?

A daily, editor-reviewed reading list about AI and software engineering. Articles retain their original headlines and link to their original sources; the MVP does not generate summaries.

## Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

The project uses Next.js App Router, TypeScript, and Tailwind CSS. Netlify deployment is configured in `netlify.toml`; public content and admin features are being implemented in staged milestones documented in `WORKFLOW.md`.

## Supabase database

Apply the SQL migration in `supabase/migrations/` to the Supabase project before connecting application data access. Public access is limited by RLS to published, non-deleted entries. Admin policies require the trusted Supabase `app_metadata.role` claim to equal `admin`; user-editable profile metadata is not used for authorization. The ingestion job should use the Supabase service role only in a protected server-side environment.

The Supabase browser and server clients use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. The client setup also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` for projects still using the legacy anon key name. Keep local values in the ignored `.env.local` file; never commit or share the service-role key.

## Admin access

There is no public sign-up flow. Disable new user sign-ups in Supabase Auth settings, create the admin account in Supabase Auth, then add `SUPABASE_SERVICE_ROLE_KEY` to the ignored `.env.local` file and grant the trusted admin claim:

```bash
npm run grant-admin -- editor@example.com
```

The provisioning script updates the existing account's `app_metadata.role` using the Supabase Auth Admin API directly. `SUPABASE_SERVICE_ROLE_KEY` can contain the newer `sb_secret_…` key or the legacy `service_role` key. Do not put either in a `NEXT_PUBLIC_` variable or Netlify. Sign in at `/admin/login` with the provisioned account.

The Supabase JavaScript client version used here requires Node.js 22 or newer; Netlify is configured to build with Node 22.

## Daily content ingestion

The GitHub Actions workflow runs once daily at 04:00 UTC and can also be started manually from the Actions tab. Configure the repository variable `NEXT_PUBLIC_SUPABASE_URL` and the secret `SUPABASE_SERVICE_ROLE_KEY` before enabling it. Apply `supabase/migrations/20261006133000_grant_ingestion_service_role.sql` to projects that already applied the initial content migration; it grants the batch job database access without exposing the key to the application.

The current batch covers verified OpenAI, Google DeepMind, and Mistral RSS feeds; Hacker News, Reddit, Hugging Face Daily Papers, and arXiv APIs. Every run is logged to `cron_logs`; records are deduplicated by `original_url` and inserted as pending. Other corporate sources will be added when a stable public RSS/API endpoint is available.

Run locally with `npm run ingest` (set `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`). Run parser tests with `npm run test:ingestion`.
