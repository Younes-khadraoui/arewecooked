import { requireAdmin } from "@/lib/auth/admin";
import { createClient } from "@/lib/supabase/server";
import { ReviewQueue } from "@/app/admin/(protected)/review-queue";

export const metadata = {
  title: "Admin — Are We Cooked Yet?",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const claims = await requireAdmin();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("entries")
    .select(
      "id,title,source_name,original_url,source_excerpt,feed_kind,published_at,created_at",
    )
    .eq("status", "pending")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(101);
  const entries = (data ?? []).slice(0, 100);

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
          {(data?.length ?? 0) > 100 ? "100+" : (data?.length ?? 0)} pending
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
              : "Could not load the review queue"}
          </h2>
          <p className="mb-0 mt-2 text-sm leading-6 text-muted-foreground">
            {error.code === "PGRST205"
              ? "The entries table is missing from this Supabase project. Apply the SQL migration at supabase/migrations/20261006124500_create_editorial_content.sql in the Supabase SQL Editor, then refresh this page."
              : "Supabase could not return pending entries. Check the project configuration and access policies, then refresh the page."}
          </p>
          {error.code !== "PGRST205" ? (
            <p className="mb-0 mt-2 break-all font-mono text-xs text-subtle">
              {error.message}
            </p>
          ) : null}
        </div>
      ) : (
        <ReviewQueue entries={entries} hasMore={(data?.length ?? 0) > 100} />
      )}
    </section>
  );
}
