"use client";

import { useState, useTransition } from "react";
import {
  triggerDailyIngestion,
  type IngestionTriggerActionState,
} from "@/app/admin/actions";

const initialState: IngestionTriggerActionState = {
  error: null,
  success: null,
};

export function IngestionTrigger() {
  const [state, setState] = useState(initialState);
  const [isPending, startTransition] = useTransition();

  function queueIngestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setState(await triggerDailyIngestion());
    });
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <form onSubmit={queueIngestion}>
        <button
          className="min-h-10 rounded-lg border border-accent/40 bg-accent/10 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "Queueing run…" : "Run ingestion now"}
        </button>
      </form>
      {state.error ? (
        <p className="m-0 max-w-sm text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="m-0 max-w-sm text-sm text-muted-foreground" role="status">
          {state.success}{" "}
          <a
            className="text-accent-soft underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
            href="https://github.com/Younes-khadraoui/arewecooked/actions/workflows/daily-ingestion.yml"
            rel="noopener noreferrer"
            target="_blank"
          >
            View workflow
          </a>
        </p>
      ) : null}
    </div>
  );
}
