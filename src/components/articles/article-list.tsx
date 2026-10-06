import type { EntryRow } from "@/lib/database.types";

export type PublishedArticle = Pick<
  EntryRow,
  "id" | "title" | "source_name" | "original_url" | "source_excerpt" | "published_at"
>;

function formatPublishedDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

export function ArticleList({
  entries,
  emptyMessage = "No published articles match these filters yet.",
  headingLevel = "h3",
}: {
  entries: PublishedArticle[];
  emptyMessage?: string;
  headingLevel?: "h2" | "h3";
}) {
  if (entries.length === 0) {
    return (
      <div className="mt-[23px] rounded-[14px] border border-dashed border-border bg-panel/50 px-5 py-10 text-center">
        <p className="m-0 text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const Heading = headingLevel;
  return (
    <ol className="m-0 mt-[23px] grid list-none gap-3 p-0">
      {entries.map((entry) => (
        <li className="min-w-0" key={entry.id}>
          <article
            aria-labelledby={`entry-title-${entry.id}`}
            className="h-full rounded-[14px] border border-border bg-panel/90 p-5 transition-colors hover:border-accent/40 sm:p-6"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-subtle">
              <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                {entry.source_name}
              </span>
              {entry.published_at ? (
                <time dateTime={entry.published_at}>
                  {formatPublishedDate(entry.published_at)}
                </time>
              ) : (
                <span>Date unavailable</span>
              )}
            </div>
            <Heading
              className="mb-0 mt-4 break-words text-lg font-semibold leading-snug tracking-[-0.03em] sm:text-xl"
              id={`entry-title-${entry.id}`}
            >
              {entry.title}
            </Heading>
            {entry.source_excerpt ? (
              <p className="mb-0 mt-3 line-clamp-4 break-words whitespace-pre-line text-sm leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                {entry.source_excerpt}
              </p>
            ) : null}
            <a
              aria-label={`Read "${entry.title}" at ${entry.source_name} (opens in a new tab)`}
              className="mt-4 inline-flex max-w-full items-center gap-1.5 break-all text-sm font-medium text-accent-soft underline decoration-accent/40 underline-offset-4 hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              href={entry.original_url}
              rel="noopener noreferrer"
              target="_blank"
            >
              Read at {entry.source_name}
              <span aria-hidden="true">↗</span>
            </a>
          </article>
        </li>
      ))}
    </ol>
  );
}
