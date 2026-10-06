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
