"use client";

import { useActionState } from "react";
import {
  deletePublishedEntry,
  type DeleteEntryActionState,
} from "@/app/admin/actions";

const initialState: DeleteEntryActionState = { error: null };

export function PublishedEntryActions({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(
    deletePublishedEntry,
    initialState,
  );

  function confirmDestructiveAction(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    const operation = submitter?.value;

    if (operation === "soft") {
      if (!window.confirm("Remove this article from the public site?")) {
        event.preventDefault();
      }
      return;
    }

    if (
      operation === "hard" &&
      !window.confirm(
        "Permanently delete this article? This cannot be undone.",
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <div className="mt-5 border-t border-border pt-4">
      <form
        action={formAction}
        className="flex flex-wrap gap-2"
        onSubmit={confirmDestructiveAction}
      >
        <input name="id" type="hidden" value={id} />
        <button
          className="min-h-10 rounded-lg border border-border bg-background px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          disabled={isPending}
          name="operation"
          type="submit"
          value="soft"
        >
          Remove from site
        </button>
        <button
          className="min-h-10 rounded-lg border border-destructive/40 bg-destructive/5 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
          disabled={isPending}
          name="operation"
          type="submit"
          value="hard"
        >
          Delete permanently
        </button>
      </form>
      {state.error ? (
        <p className="mb-0 mt-3 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
