"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { moderateEntry, type ModerationActionState } from "@/app/admin/actions";
import type { EntryRow } from "@/lib/database.types";

const initialState: ModerationActionState = { error: null, success: null };
type ReviewQueueEntry = Pick<
  EntryRow,
  | "id"
  | "title"
  | "source_name"
  | "original_url"
  | "source_excerpt"
  | "published_at"
>;

function formatDate(value: string | null) {
  if (!value) {
    return "Publication date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function ReviewCard({
  entry,
  index,
  selected,
  registerForm,
}: {
  entry: ReviewQueueEntry;
  index: number;
  selected: boolean;
  registerForm: (index: number, form: HTMLFormElement | null) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    moderateEntry,
    initialState,
  );

  return (
    <article
      aria-current={selected ? "true" : undefined}
      className={`rounded-xl border bg-panel p-5 transition-colors sm:p-6 ${
        selected ? "border-accent/60" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        <span className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
          {entry.source_name}
        </span>
        <span>{formatDate(entry.published_at)}</span>
      </div>

      <h2 className="mb-0 mt-4 text-lg font-semibold leading-snug tracking-[-0.03em] sm:text-xl">
        {entry.title}
      </h2>

      {entry.source_excerpt ? (
        <p className="mb-0 mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {entry.source_excerpt}
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

      <form
        action={formAction}
        className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4"
        ref={(form) => registerForm(index, form)}
      >
        <input name="id" type="hidden" value={entry.id} />
        <button
          className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled={isPending}
          name="decision"
          type="submit"
          value="published"
        >
          Approve
        </button>
        <button
          className="min-h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled={isPending}
          name="decision"
          type="submit"
          value="rejected"
        >
          Reject
        </button>
      </form>
      {state.error ? (
        <p className="mb-0 mt-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mb-0 mt-3 text-sm text-muted-foreground" role="status">
          {state.success}
        </p>
      ) : null}
    </article>
  );
}

export function ReviewQueue({
  entries,
  hasMore,
}: {
  entries: ReviewQueueEntry[];
  hasMore: boolean;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const forms = useRef<Array<HTMLFormElement | null>>([]);

  useEffect(() => {
    const activeIndex = Math.max(
      0,
      Math.min(selectedIndex, entries.length - 1),
    );

    function onKeyDown(event: KeyboardEvent) {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(
              event.target.tagName,
            )))
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "j" || key === "k") {
        event.preventDefault();
        setSelectedIndex((current) =>
          Math.max(
            0,
            Math.min(
              entries.length - 1,
              current + (key === "j" ? 1 : -1),
            ),
          ),
        );
        return;
      }

      const decision =
        key === "a" ? "published" : key === "x" ? "rejected" : null;
      if (!decision || entries.length === 0) {
        return;
      }

      const form = forms.current[activeIndex];
      const submitter = form?.querySelector<HTMLButtonElement>(
        `button[name="decision"][value="${decision}"]`,
      );
      if (form && submitter) {
        event.preventDefault();
        form.requestSubmit(submitter);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [entries.length, selectedIndex]);

  if (entries.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-16 text-center">
        <p className="m-0 text-base font-semibold">Queue is clear.</p>
        <p className="mb-0 mt-2 text-sm text-muted-foreground">
          Newly ingested articles will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Pending articles" className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-xs text-muted-foreground">
          {hasMore
            ? "Showing the first 100 pending entries."
            : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} to review.`}
        </p>
        <p className="m-0 hidden text-xs text-subtle sm:block">
          <kbd className="rounded border border-border px-1.5 py-1 font-mono">J</kbd>
          {" / "}
          <kbd className="rounded border border-border px-1.5 py-1 font-mono">K</kbd>
          {" navigate · "}
          <kbd className="rounded border border-border px-1.5 py-1 font-mono">A</kbd>
          {" approve · "}
          <kbd className="rounded border border-border px-1.5 py-1 font-mono">X</kbd>
          {" reject"}
        </p>
      </div>
      <ol className="m-0 grid list-none gap-4 p-0">
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <ReviewCard
              entry={entry}
              index={index}
              registerForm={(formIndex, form) => {
                forms.current[formIndex] = form;
              }}
              selected={index === Math.min(selectedIndex, entries.length - 1)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}
