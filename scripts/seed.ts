import { runIngestion } from "./ingest.ts";

function loadLocalEnvironment() {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw new Error("Could not load local ingestion environment.", {
      cause: error,
    });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unknown error occurred.";
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    loadLocalEnvironment();
  } catch (error) {
    console.error("Historical seed failed:", errorMessage(error));
    process.exitCode = 1;
  }

  if (process.exitCode !== 1) {
    runIngestion(new Date(), { lookbackDays: 30 })
      .then((summary) => {
        for (const anomaly of summary.anomalies) {
          const diagnostic = `[${anomaly.severity}] ${anomaly.feed}: ${anomaly.message}`;
          if (anomaly.severity === "error") {
            console.error(diagnostic);
          } else {
            console.warn(diagnostic);
          }
        }
        if (summary.status !== "succeeded") {
          process.exitCode = 1;
        }
      })
      .catch((error: unknown) => {
        console.error("Historical seed failed:", errorMessage(error));
        process.exitCode = 1;
      });
  }
}
