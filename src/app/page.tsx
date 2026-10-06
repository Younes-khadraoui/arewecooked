import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

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

export default function Home() {
  return (
    <main className="min-h-screen">
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
          <span className="my-[18px] hidden h-px bg-border md:block" />
          <span className="hidden text-[11px] text-muted-foreground md:block">
            Curated, not generated.
          </span>
        </aside>
      </section>

      <section
        aria-labelledby="latest-title"
        className="mx-auto w-full max-w-[1120px] border-t border-border px-5 pb-[38px] pt-7 sm:px-6 md:pb-[50px]"
      >
        <div className="flex items-end justify-between">
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

        <div className="mt-[23px] flex min-h-[220px] flex-col items-center justify-center rounded-[14px] border border-dashed border-border bg-panel/50 px-5 py-8 text-center md:min-h-[246px]">
          <span
            aria-hidden="true"
            className="mb-[19px] flex h-7 items-end gap-1 text-accent"
          >
            <span className="h-3 w-1 rounded-full bg-current opacity-70" />
            <span className="h-[21px] w-1 rounded-full bg-current opacity-70" />
            <span className="h-4 w-1 rounded-full bg-current opacity-70" />
          </span>
          <p className="mb-[7px] text-[15px] font-semibold tracking-[-0.02em]">
            The first edition is on its way.
          </p>
          <p className="mb-0 max-w-[390px] text-[13px] leading-[1.65] text-subtle">
            We’re setting up the reading desk. New stories will appear here
            after they’re reviewed by an editor.
          </p>
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

      <footer className="mx-auto flex min-h-[72px] w-full max-w-[1120px] items-center justify-between border-t border-border px-5 text-[11px] text-subtle sm:px-6">
        <Link className="font-semibold text-muted-foreground" href="/">
          Are We Cooked Yet?
        </Link>
        <span>Good signal. Better coffee.</span>
      </footer>
    </main>
  );
}
