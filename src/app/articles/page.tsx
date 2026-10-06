import Link from "next/link";
import { redirect } from "next/navigation";
import { ArticleFilters } from "@/components/articles/article-filters";
import { ArticleList } from "@/components/articles/article-list";
import { Pagination } from "@/components/pagination";
import { ThemeToggle } from "@/components/theme-toggle";
import { findArticlePlatform } from "@/lib/article-platforms";
import { createClient } from "@/lib/supabase/server";

const pageSize = 10;

function buildPageHref(page: number, platform: string, sort: string) {
  const params = new URLSearchParams();
  if (platform) {
    params.set("platform", platform);
  }
  if (sort !== "latest") {
    params.set("sort", sort);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `/articles?${query}` : "/articles";
}

export const metadata = {
  title: "All articles — Are We Cooked Yet?",
  description:
    "Browse the editor-reviewed AI and engineering reading list by platform and publication date.",
};

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    platform?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const platformValue = typeof params.platform === "string" ? params.platform : "";
  const platform = findArticlePlatform(platformValue);
  const sort = params.sort === "oldest" ? "oldest" : "latest";
  const requestedPage =
    typeof params.page === "string" && /^\d+$/.test(params.page)
      ? Math.max(1, Number(params.page))
      : 1;
  const supabase = await createClient();
  let query = supabase
    .from("entries")
    .select("id,title,source_name,original_url,source_excerpt,published_at", {
      count: "exact",
    })
    .eq("status", "published")
    .is("deleted_at", null);

  if (platform) {
    query = query.in("source_name", [...platform.sourceNames]);
  }

  const { data, error, count } = await query
    .order("published_at", { ascending: sort === "oldest", nullsFirst: false })
    .order("created_at", { ascending: false })
    .range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);

  if (error) {
    throw new Error("Unable to load the article archive.", { cause: error });
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (requestedPage > totalPages) {
    redirect(buildPageHref(totalPages, platform?.value ?? "", sort));
  }

  return (
    <>
      <a
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only"
        href="#articles-content"
      >
        Skip to articles
      </a>
      <header className="mx-auto flex min-h-[82px] w-full max-w-[1120px] items-center justify-between border-b border-border px-5 sm:px-6">
        <Link
          aria-label="Are We Cooked Yet home"
          className="flex items-center gap-2.5"
          href="/"
        >
          <span
            aria-hidden="true"
            className="grid size-[30px] place-items-center rounded-[10px] border border-accent/50 bg-accent/10 text-[11px] font-bold tracking-[-0.08em] text-accent-soft"
          >
            aw
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.025em]">
            Are We Cooked Yet?
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <main
        className="mx-auto min-h-[calc(100vh-154px)] w-full max-w-[900px] px-5 py-12 sm:px-6 md:py-16"
        id="articles-content"
      >
        <Link
          className="text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
          href="/"
        >
          Back to home
        </Link>
        <div className="mt-8">
          <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
            EDITOR-REVIEWED READING LIST
          </p>
          <h1 className="mb-0 mt-3 text-3xl font-semibold tracking-[-0.055em] sm:text-4xl">
            All articles
          </h1>
          <p className="mb-0 mt-3 text-sm text-muted-foreground">
            {totalCount} {totalCount === 1 ? "article" : "articles"}
            {platform ? ` from ${platform.label}` : ""}.
          </p>
        </div>

        <ArticleFilters
          action="/articles"
          platform={platform?.value ?? ""}
          sort={sort}
        />
        <ArticleList entries={data ?? []} headingLevel="h2" />
        <Pagination
          hrefForPage={(page) =>
            buildPageHref(page, platform?.value ?? "", sort)
          }
          page={requestedPage}
          totalPages={totalPages}
        />
      </main>

      <footer className="mx-auto flex min-h-[72px] w-full max-w-[1120px] items-center justify-between border-t border-border px-5 text-[11px] text-subtle sm:px-6">
        <Link className="font-semibold text-muted-foreground" href="/">
          Are We Cooked Yet?
        </Link>
        <span>Good signal. Better coffee.</span>
      </footer>
    </>
  );
}
