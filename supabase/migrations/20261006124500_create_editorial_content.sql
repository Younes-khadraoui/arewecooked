create table public.entries (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 500),
  source_name text not null check (char_length(trim(source_name)) between 1 and 120),
  original_url text not null unique check (
    char_length(trim(original_url)) between 1 and 2048
    and original_url ~ '^https?://[^[:space:]]+$'
  ),
  source_excerpt text check (source_excerpt is null or char_length(source_excerpt) <= 12000),
  feed_kind text not null check (
    feed_kind in ('rss', 'atom', 'api', 'hacker_news', 'reddit', 'hugging_face', 'arxiv')
  ),
  published_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'published', 'rejected')),
  review_notes text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint entries_review_state_consistent check (
    (status = 'pending' and reviewed_at is null)
    or (status in ('published', 'rejected') and reviewed_at is not null)
  )
);

create index entries_publication_order_idx
  on public.entries (published_at desc nulls last, created_at desc)
  where status = 'published' and deleted_at is null;

create index entries_review_queue_idx
  on public.entries (created_at asc)
  where status = 'pending' and deleted_at is null;

create table public.cron_logs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  feeds_parsed integer not null default 0 check (feeds_parsed >= 0),
  entries_found integer not null default 0 check (entries_found >= 0),
  entries_inserted integer not null default 0 check (entries_inserted >= 0),
  anomaly_count integer not null default 0 check (anomaly_count >= 0),
  anomalies jsonb not null default '[]'::jsonb check (
    jsonb_typeof(anomalies) = 'array'
    and anomaly_count = jsonb_array_length(anomalies)
  ),
  status text not null default 'running' check (status in ('running', 'succeeded', 'partial', 'failed')),
  error_message text,
  constraint cron_logs_completion_consistent check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at is not null)
  )
);

create index cron_logs_recent_idx on public.cron_logs (started_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_set_updated_at
  before update on public.entries
  for each row execute function public.set_updated_at();

alter table public.entries enable row level security;
alter table public.cron_logs enable row level security;

create policy "Published entries are publicly readable"
  on public.entries
  for select
  to anon, authenticated
  using (status = 'published' and deleted_at is null);

create policy "Admins can manage entries"
  on public.entries
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admins can manage cron logs"
  on public.cron_logs
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

grant select on public.entries to anon, authenticated;
grant insert, update, delete on public.entries to authenticated;
grant select, insert, update, delete on public.cron_logs to authenticated;
