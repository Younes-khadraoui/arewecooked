import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "@/app/admin/(protected)/review-queue";
import { EntryDetailsEditor } from "@/app/admin/(protected)/entry-details-editor";

export const metadata = {
  title: "Admin — Are We Cooked Yet?",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const claims = await requireAdmin();
  const supabase = await createClient();
  const [pendingResult, publishedResult] = await Promise.all([
    supabase
      .from("entries")
      .select(
        "id,title,source_name,original_url,source_excerpt,feed_kind,published_at,created_at",
      )
      .eq("status", "pending")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(101),
    supabase
      .from("entries")
      .select("id,title,source_name,original_url,published_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(21),
  ]);
  const entries = (pendingResult.data ?? []).slice(0, 100);
  const publishedEntries = (publishedResult.data ?? []).slice(0, 20);
  const error = pendingResult.error ?? publishedResult.error;

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
            Signed in as {claims.email ?? "admin"} · Pending articles only
          </p>
        </div>
        <span className="rounded-full border border-border bg-panel px-3 py-1.5 text-xs text-muted-foreground">
          {(pendingResult.data?.length ?? 0) > 100
            ? "100+"
            : (pendingResult.data?.length ?? 0)}{" "}
          pending
        </span>
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
          <ReviewQueue
            entries={entries}
            hasMore={(pendingResult.data?.length ?? 0) > 100}
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
