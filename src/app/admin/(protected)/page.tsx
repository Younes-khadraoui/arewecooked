import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "@/app/admin/(protected)/review-queue";
import { EntryDetailsEditor } from "@/app/admin/(protected)/entry-details-editor";
import { PublishedEntryActions } from "@/app/admin/(protected)/published-entry-actions";
import { RejectedEntries } from "@/app/admin/(protected)/rejected-entries";
import { SystemHealth } from "@/app/admin/(protected)/system-health";
import { ArticleFilters } from "@/components/articles/article-filters";
import { Pagination } from "@/components/pagination";
import { findArticlePlatform } from "@/lib/article-platforms";

const queuePageSize = 20;

function adminFilterHref(
  status: "pending" | "rejected",
  platform: string,
  query: string,
) {
  const params = new URLSearchParams();
  if (status === "rejected") {
    params.set("status", status);
  }
  if (platform) {
    params.set("platform", platform);
  }
  if (query) {
    params.set("q", query);
  }
  const queryString = params.toString();
  return queryString ? `/admin?${queryString}` : "/admin";
}

function adminPageHref(
  page: number,
  status: "pending" | "rejected",
  platform: string,
  query: string,
) {
  const params = new URLSearchParams();
  if (status === "rejected") {
    params.set("status", status);
  }
  if (platform) {
    params.set("platform", platform);
  }
  if (query) {
    params.set("q", query);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  return `/admin?${params.toString()}`;
}

export const metadata = {
  title: "Admin — Are We Cooked Yet?",
  robots: { index: false, follow: false },
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    platform?: string | string[];
    q?: string | string[];
    status?: string | string[];
  }>;
}) {
  const claims = await requireAdmin();
  const supabase = await createClient();
  const params = await searchParams;
  const activeFilter = params.status === "rejected" ? "rejected" : "pending";
  const platformValue = typeof params.platform === "string" ? params.platform : "";
  const platform = findArticlePlatform(platformValue);
  const searchQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage =
    typeof params.page === "string" && /^\d+$/.test(params.page)
      ? Math.max(1, Number(params.page))
      : 1;
  let queueQuery = supabase
    .from("entries")
    .select(
      "id,title,source_name,original_url,source_excerpt,feed_kind,published_at,created_at,review_notes,reviewed_at",
      { count: "exact" },
    )
    .eq("status", activeFilter)
    .is("deleted_at", null);
  if (platform) {
    queueQuery = queueQuery.in("source_name", [...platform.sourceNames]);
  }
  if (searchQuery) {
    queueQuery = queueQuery.ilike(
      "title",
      `%${searchQuery.replace(/[\\%_]/g, "\\$&")}%`,
    );
  }
  queueQuery = queueQuery
    .order(activeFilter === "pending" ? "created_at" : "reviewed_at", {
      ascending: activeFilter === "pending",
      nullsFirst: false,
    })
    .range((requestedPage - 1) * queuePageSize, requestedPage * queuePageSize - 1);

  const [
    queueResult,
    pendingCountResult,
    rejectedCountResult,
    publishedResult,
    cronLogsResult,
  ] = await Promise.all([
    queueQuery,
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .is("deleted_at", null),
    supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .is("deleted_at", null),
    supabase
      .from("entries")
      .select("id,title,source_name,original_url,published_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(21),
    supabase
      .from("cron_logs")
      .select(
        "id,started_at,completed_at,feeds_parsed,entries_found,entries_inserted,anomaly_count,anomalies,status,error_message",
      )
      .order("started_at", { ascending: false })
      .limit(20),
  ]);
  const entries = (queueResult.data ?? []).slice(0, queuePageSize);
  const publishedEntries = (publishedResult.data ?? []).slice(0, 20);
  const error =
    queueResult.error ??
    pendingCountResult.error ??
    rejectedCountResult.error ??
    publishedResult.error;
  const totalCount = queueResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / queuePageSize));
  if (!error && requestedPage > totalPages) {
    redirect(
      adminPageHref(
        totalPages,
        activeFilter,
        platform?.value ?? "",
        searchQuery,
      ),
    );
  }

  return (
    <section className="py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
            ADMIN PORTAL
          </p>
          <h1 className="mb-0 mt-3 text-3xl font-semibold tracking-[-0.055em]">
            Review queue
          </h1>
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            Signed in as {claims.email ?? "admin"} ·{" "}
            {activeFilter === "pending"
              ? "Pending articles"
              : "Rejected article history"}
          </p>
        </div>
        <nav aria-label="Review queue filters" className="flex gap-2">
          <Link
            aria-current={activeFilter === "pending" ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              activeFilter === "pending"
                ? "border-accent/50 bg-accent/10 text-foreground"
                : "border-border bg-panel text-muted-foreground hover:text-foreground"
            }`}
            href={adminFilterHref(
              "pending",
              platform?.value ?? "",
              searchQuery,
            )}
          >
            Pending {pendingCountResult.count ?? 0}
          </Link>
          <Link
            aria-current={activeFilter === "rejected" ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
              activeFilter === "rejected"
                ? "border-accent/50 bg-accent/10 text-foreground"
                : "border-border bg-panel text-muted-foreground hover:text-foreground"
            }`}
            href={adminFilterHref(
              "rejected",
              platform?.value ?? "",
              searchQuery,
            )}
          >
            Rejected {rejectedCountResult.count ?? 0}
          </Link>
        </nav>
      </div>

      {error ? (
        <div
          className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-5"
          role="alert"
        >
          <h2 className="m-0 text-base font-semibold text-foreground">
            {error.code === "PGRST205"
              ? "Set up the content database"
              : "Could not load admin articles"}
          </h2>
          <p className="mb-0 mt-2 text-sm leading-6 text-muted-foreground">
            {error.code === "PGRST205"
              ? "The entries table is missing from this Supabase project. Apply the SQL migration at supabase/migrations/20261006124500_create_editorial_content.sql in the Supabase SQL Editor, then refresh this page."
              : "Supabase could not return entries. Check the project configuration and access policies, then refresh the page."}
          </p>
          {error.code !== "PGRST205" ? (
            <p className="mb-0 mt-2 break-all font-mono text-xs text-subtle">
              {error.message}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <ArticleFilters
            action="/admin"
            platform={platform?.value ?? ""}
            query={searchQuery}
            status={activeFilter}
          />
          {activeFilter === "pending" ? (
            <ReviewQueue entries={entries} totalCount={totalCount} />
          ) : (
            <RejectedEntries entries={entries} totalCount={totalCount} />
          )}
          <Pagination
            hrefForPage={(page) =>
              adminPageHref(
                page,
                activeFilter,
                platform?.value ?? "",
                searchQuery,
              )
            }
            page={requestedPage}
            totalPages={totalPages}
          />

          <SystemHealth
            error={cronLogsResult.error?.message ?? null}
            runs={cronLogsResult.data ?? []}
          />

          <section aria-labelledby="published-articles-title" className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
                  LIVE ON THE SITE
                </p>
                <h2
                  className="mb-0 mt-2 text-2xl font-semibold tracking-[-0.045em]"
                  id="published-articles-title"
                >
                  Published articles
                </h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {(publishedResult.data?.length ?? 0) > 20
                  ? "Latest 20"
                  : `${publishedEntries.length} ${publishedEntries.length === 1 ? "article" : "articles"}`}
              </span>
            </div>

            {publishedEntries.length === 0 ? (
              <p className="mb-0 mt-5 text-sm text-muted-foreground">
                No published articles to edit yet.
              </p>
            ) : (
              <ol className="m-0 mt-4 grid list-none gap-4 p-0">
                {publishedEntries.map((entry) => (
                  <li
                    className="rounded-xl border border-border bg-panel p-5 sm:p-6"
                    key={entry.id}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
                      <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                        {entry.source_name}
                      </span>
                      <span>
                        {entry.published_at
                          ? new Intl.DateTimeFormat("en", {
                              dateStyle: "medium",
                              timeZone: "UTC",
                            }).format(new Date(entry.published_at))
                          : "Publication date unavailable"}
                      </span>
                    </div>
                    <h3 className="mb-0 mt-3 text-base font-semibold leading-snug tracking-[-0.025em]">
                      {entry.title}
                    </h3>
                    <EntryDetailsEditor
                      id={entry.id}
                      originalUrl={entry.original_url}
                      title={entry.title}
                    />
                    <PublishedEntryActions id={entry.id} />
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </section>
  );
}
