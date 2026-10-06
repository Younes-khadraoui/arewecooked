import type { EntryRow } from "@/lib/database.types";

type RejectedEntry = Pick<
  EntryRow,
  "id" | "title" | "source_name" | "original_url" | "review_notes" | "reviewed_at"
>;

function formatReviewDate(value: string | null) {
  if (!value) {
    return "Review date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function RejectedEntries({
  entries,
  hasMore,
}: {
  entries: RejectedEntry[];
  hasMore: boolean;
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="m-0 text-base font-semibold">No rejected articles.</p>
        <p className="mb-0 mt-2 text-sm text-muted-foreground">
          Rejected submissions will remain available here for review.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Rejected articles" className="mt-8">
      <p className="mb-4 text-xs text-muted-foreground">
        {hasMore
          ? "Showing the 20 most recently rejected articles."
          : `${entries.length} rejected ${entries.length === 1 ? "article" : "articles"}.`}
      </p>
      <ol className="m-0 grid list-none gap-4 p-0">
        {entries.map((entry) => (
          <li
            className="rounded-xl border border-border bg-panel p-5 sm:p-6"
            key={entry.id}
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
              <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                {entry.source_name}
              </span>
              <span>{formatReviewDate(entry.reviewed_at)}</span>
            </div>
            <h2 className="mb-0 mt-4 text-lg font-semibold leading-snug tracking-[-0.03em]">
              {entry.title}
            </h2>
            {entry.review_notes ? (
              <p className="mb-0 mt-3 text-sm leading-6 text-muted-foreground">
                {entry.review_notes}
              </p>
            ) : null}
            <a
              className="mt-4 inline-flex max-w-full break-all text-sm text-accent-soft underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={entry.original_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Open original article
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
