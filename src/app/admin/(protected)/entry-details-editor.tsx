"use client";

import { useActionState } from "react";
import {
  updateEntryDetails,
  type EditEntryActionState,
} from "@/app/admin/actions";

const initialState: EditEntryActionState = { error: null, success: null };

export function EntryDetailsEditor({
  id,
  title,
  originalUrl,
}: {
  id: string;
  title: string;
  originalUrl: string;
}) {
  const [state, formAction, isPending] = useActionState(
    updateEntryDetails,
    initialState,
  );

  return (
    <details className="mt-5 border-t border-border pt-4">
      <summary className="w-fit cursor-pointer text-sm font-medium text-muted-foreground marker:text-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
        Edit title or source URL
      </summary>
      <form action={formAction} className="mt-4 grid gap-4">
        <input name="id" type="hidden" value={id} />
        <div className="grid gap-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`title-${id}`}
          >
            Article title
          </label>
          <input
            className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            defaultValue={title}
            id={`title-${id}`}
            maxLength={500}
            name="title"
            required
          />
        </div>
        <div className="grid gap-2">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`original-url-${id}`}
          >
            Source URL
          </label>
          <input
            className="min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            defaultValue={originalUrl}
            id={`original-url-${id}`}
            maxLength={2048}
            name="original_url"
            required
            type="url"
          />
        </div>
        <button
          className="min-h-10 w-fit rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Saving…" : "Save edits"}
        </button>
        {state.error ? (
          <p className="m-0 text-sm text-destructive" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="m-0 text-sm text-muted-foreground" role="status">
            {state.success}
          </p>
        ) : null}
      </form>
    </details>
  );
}
