import type { CronLogRow, Json } from "@/lib/database.types";

type CronRun = Pick<
  CronLogRow,
  | "id"
  | "started_at"
  | "completed_at"
  | "feeds_parsed"
  | "entries_found"
  | "entries_inserted"
  | "anomaly_count"
  | "anomalies"
  | "status"
  | "error_message"
>;

const statusStyles = {
  running: "border-accent/40 bg-accent/10 text-accent-soft",
  succeeded: "border-chart-3/40 bg-chart-3/10 text-chart-3",
  partial: "border-chart-4/40 bg-chart-4/10 text-chart-4",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
} as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatDuration(startedAt: string, completedAt: string | null) {
  if (!completedAt) {
    return "In progress";
  }

  const duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  if (!Number.isFinite(duration) || duration < 0) {
    return "Duration unavailable";
  }

  if (duration < 1000) {
    return "<1 second";
  }
  if (duration < 60_000) {
    return `${Math.round(duration / 1000)} seconds`;
  }
  return `${Math.floor(duration / 60_000)}m ${Math.round((duration % 60_000) / 1000)}s`;
}

function formatAnomaly(anomaly: Json) {
  if (typeof anomaly === "string") {
    return anomaly;
  }
  if (typeof anomaly === "number" || typeof anomaly === "boolean") {
    return String(anomaly);
  }
  if (anomaly && typeof anomaly === "object" && !Array.isArray(anomaly)) {
    const readableFields = ["message", "error", "feed", "source", "status", "code"]
      .map((key) => anomaly[key])
      .filter(
        (value): value is string | number =>
          typeof value === "string" || typeof value === "number",
      );

    if (readableFields.length > 0) {
      return readableFields.join(" · ");
    }
  }

  return JSON.stringify(anomaly) ?? "Unspecified ingestion anomaly";
}

function getAnomalies(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function isErrorDiagnostic(value: Json): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    value.severity === "error"
  );
}

export function SystemHealth({
  error,
  runs,
}: {
  error: string | null;
  runs: CronRun[];
}) {
  const latestRun = runs[0];

  return (
    <section aria-labelledby="system-health-title" className="mt-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
        <div>
          <p className="m-0 text-[10px] font-bold tracking-[0.14em] text-subtle">
            INGESTION TELEMETRY
          </p>
          <h2
            className="mb-0 mt-2 text-2xl font-semibold tracking-[-0.045em]"
            id="system-health-title"
          >
            System health
          </h2>
        </div>
        {latestRun ? (
          <span
            className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize ${statusStyles[latestRun.status]}`}
          >
            Latest run: {latestRun.status}
          </span>
        ) : null}
      </div>

      {error ? (
        <div
          className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-5"
          role="alert"
        >
          <p className="m-0 text-sm font-semibold text-foreground">
            Could not load ingestion history
          </p>
          <p className="mb-0 mt-2 break-all text-sm text-muted-foreground">
            {error}
          </p>
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-border px-6 py-10 text-center">
          <p className="m-0 text-sm font-semibold">No ingestion runs recorded.</p>
          <p className="mb-0 mt-2 text-sm text-muted-foreground">
            Run history and feed diagnostics will appear here after the daily
            ingestion job is configured.
          </p>
        </div>
      ) : (
        <ol className="m-0 mt-5 grid list-none gap-3 p-0">
          {runs.map((run) => {
            const anomalies = getAnomalies(run.anomalies);

            return (
              <li
                className="rounded-xl border border-border bg-panel p-5 sm:p-6"
                key={run.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="m-0 text-sm font-semibold">
                      {formatDate(run.started_at)}
                    </p>
                    <p className="mb-0 mt-1 text-xs text-muted-foreground">
                      Duration: {formatDuration(run.started_at, run.completed_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[run.status]}`}
                  >
                    {run.status}
                  </span>
                </div>

                <dl className="mb-0 mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Feeds parsed", run.feeds_parsed],
                    ["Entries found", run.entries_found],
                    ["Entries added", run.entries_inserted],
                    ["Feed diagnostics", run.anomaly_count],
                  ].map(([label, value]) => (
                    <div
                      className="rounded-lg border border-border bg-background/50 px-3 py-2.5"
                      key={label}
                    >
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mb-0 mt-1 font-mono text-sm font-semibold">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                {run.error_message ? (
                  <p
                    className="mb-0 mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    role="alert"
                  >
                    {run.error_message}
                  </p>
                ) : null}

                {anomalies.length > 0 ? (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">
                      Feed diagnostics
                    </p>
                    <ul className="m-0 grid list-none gap-2 p-0">
                      {anomalies.map((anomaly, index) => (
                        <li
                          className={`rounded-lg border px-3 py-2 text-sm text-muted-foreground ${
                            isErrorDiagnostic(anomaly)
                              ? "border-destructive/30 bg-destructive/5"
                              : "border-chart-4/30 bg-chart-4/5"
                          }`}
                          key={`${run.id}-${index}`}
                        >
                          {formatAnomaly(anomaly)}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
