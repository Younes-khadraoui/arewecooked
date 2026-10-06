import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  hrefForPage,
}: {
  page: number;
  totalPages: number;
  hrefForPage: (page: number) => string;
}) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-4 border-t border-border pt-5"
    >
      {page > 1 ? (
        <Link
          className="rounded-lg border border-border bg-panel px-4 py-2 text-sm text-foreground hover:border-accent/50"
          href={hrefForPage(page - 1)}
          rel="prev"
        >
          Previous
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm text-subtle">Previous</span>
      )}
      <span aria-current="page" className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          className="rounded-lg border border-border bg-panel px-4 py-2 text-sm text-foreground hover:border-accent/50"
          href={hrefForPage(page + 1)}
          rel="next"
        >
          Next
        </Link>
      ) : (
        <span className="px-4 py-2 text-sm text-subtle">Next</span>
      )}
    </nav>
  );
}
