import { ThemeToggle } from "@/components/theme-toggle";
import { ArticleFilters } from "@/components/articles/article-filters";
import { ArticleList } from "@/components/articles/article-list";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { findArticlePlatform } from "@/lib/article-platforms";

const sources = [
  "OpenAI",
  "Anthropic",
  "Google DeepMind",
  "Meta AI",
  "Mistral",
  "Hugging Face",
  "arXiv",
  "Hacker News",
  "Reddit",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    platform?: string | string[];
    q?: string | string[];
    sort?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const platformValue =
    typeof params.platform === "string" ? params.platform : "";
  const platform = findArticlePlatform(platformValue);
  const searchQuery =
    typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const sort = params.sort === "oldest" ? "oldest" : "latest";
  const supabase = await createClient();
  let query = supabase
    .from("entries")
    .select("id,title,source_name,original_url,source_excerpt,published_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: sort === "oldest", nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(6);

  if (platform) {
    query = query.in("source_name", [...platform.sourceNames]);
  }
  if (searchQuery) {
    query = query.ilike("title", `%${searchQuery.replace(/[\\%_]/g, "\\$&")}%`);
  }
  const { data, error } = await query;

  if (error) {
    throw new Error("Unable to load published articles for the homepage.", {
      cause: error,
    });
  }

  return (
    <>
      <a
        className="sr-only fixed left-4 top-4 z-50 rounded-lg bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-lg focus:not-sr-only"
        href="#main-content"
      >
        Skip to main content
      </a>
      <header className="mx-auto flex min-h-[82px] w-full max-w-[1120px] items-center justify-between border-b border-border px-5 sm:px-6">
        <Link
          aria-label="Are We Cooked home"
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
            Are We Cooked?
          </span>
        </Link>

        <nav
          aria-label="Main navigation"
          className="flex items-center gap-3.5 sm:gap-[23px]"
        >
          <a
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            href="#sources"
          >
            Sources
          </a>
          <span aria-hidden="true" className="h-5 w-px bg-border" />
          <ThemeToggle />
        </nav>
      </header>

      <main className="min-h-screen" id="main-content">
        <section
          aria-labelledby="page-title"
          className="mx-auto grid w-full max-w-[1120px] items-end gap-8 px-5 py-[65px] sm:px-6 md:grid-cols-[minmax(0,1fr)_220px] md:gap-16 md:py-[91px]"
        >
          <div>
            <p className="m-0 flex items-center gap-2.5 text-[10px] font-bold tracking-[0.14em] text-subtle">
              <span
                aria-hidden="true"
                className="size-[7px] rounded-full bg-accent shadow-[0_0_12px_var(--color-accent)]"
              />
              THE DAILY AI & ENGINEERING BRIEFING
            </p>
            <h1
              className="mb-[18px] mt-6 text-[clamp(43px,11vw,64px)] font-semibold leading-[.99] tracking-[-0.075em] md:text-[clamp(42px,6.2vw,72px)]"
              id="page-title"
            >
              What matters in AI,
              <br />
              <span className="text-accent-soft">without the noise.</span>
            </h1>
            <p className="mb-0 max-w-[510px] text-[14px] leading-[1.75] text-muted-foreground md:text-base">
              A thoughtful daily reading list for people building software.
              Original headlines, direct links, and editor-reviewed selections.
            </p>
          </div>

          <aside
            aria-label="Edition schedule"
            className="grid grid-cols-[1fr_auto] items-center gap-x-3.5 rounded-[13px] border border-border bg-panel/90 p-3.5 md:flex md:flex-col md:items-stretch md:p-[18px]"
          >
            <span className="text-[9px] font-bold tracking-[0.14em] text-subtle">
              THE DAILY EDITION
            </span>
            <span className="row-span-2 text-[30px] font-medium leading-none tracking-[-0.07em] md:mt-[17px] md:text-[39px]">
              04:00
            </span>
            <span className="mt-[3px] text-[11px] text-subtle md:mt-[5px]">
              UTC · once a day
            </span>
            <span
              aria-hidden="true"
              className="my-[18px] hidden h-px bg-border md:block"
            />
            <span className="hidden text-[11px] text-muted-foreground md:block">
              Curated, not generated.
            </span>
          </aside>
        </section>

        <section
          aria-labelledby="latest-title"
          className="mx-auto w-full max-w-[1120px] border-t border-border px-5 pb-[38px] pt-7 sm:px-6 md:pb-[50px]"
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 text-[9px] font-bold tracking-[0.14em] text-subtle">
                THE READING LIST
              </p>
              <h2
                className="mb-0 mt-2 text-[25px] font-medium tracking-[-0.045em]"
                id="latest-title"
              >
                Latest signals
              </h2>
            </div>
            <span className="pb-[3px] text-xs text-subtle">Updated daily</span>
          </div>

          <ArticleFilters
            action="/"
            platform={platform?.value ?? ""}
            query={searchQuery}
            sort={sort}
          />
          <ArticleList
            emptyMessage="No published articles match these filters yet."
            entries={(data ?? []).slice(0, 5)}
          />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-xs text-subtle">
              Showing up to 5 articles
              {platform ? ` from ${platform.label}` : ""}.
            </p>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent/20"
              href={`/articles${platform || searchQuery || sort !== "latest" ? `?${new URLSearchParams({ ...(platform ? { platform: platform.value } : {}), ...(searchQuery ? { q: searchQuery } : {}), ...(sort !== "latest" ? { sort } : {}) })}` : ""}`}
            >
              See all articles
            </Link>
          </div>
        </section>

        <section
          aria-labelledby="sources-title"
          className="mx-auto grid w-full max-w-[1120px] gap-6 border-t border-border px-5 py-[35px] sm:px-6 md:grid-cols-[0.9fr_1.1fr] md:gap-[70px] md:pb-[57px] md:pt-[42px]"
          id="sources"
        >
          <div>
            <p className="m-0 text-[9px] font-bold tracking-[0.14em] text-subtle">
              OUR READING DESK
            </p>
            <h2
              className="mb-0 mt-[11px] text-[25px] font-medium tracking-[-0.045em]"
              id="sources-title"
            >
              Close to the source.
            </h2>
            <p className="mb-0 mt-3 max-w-[360px] text-[13px] leading-[1.7] text-subtle">
              Stories are linked back to their original publishers. No invented
              headlines or machine-written summaries.
            </p>
          </div>
          <ul
            aria-label="Sources monitored"
            className="m-0 flex list-none flex-wrap content-center gap-[9px] p-0"
          >
            {sources.map((source) => (
              <li
                className="rounded-full border border-border bg-panel px-3 py-[9px] text-xs text-muted-foreground"
                key={source}
              >
                {source}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto flex min-h-[72px] w-full max-w-[1120px] items-center justify-between border-t border-border px-5 text-[11px] text-subtle sm:px-6">
        <Link className="font-semibold text-muted-foreground" href="/">
          Are We Cooked?
        </Link>
        <span>Good signal. Better coffee.</span>
      </footer>
    </>
  );
}
