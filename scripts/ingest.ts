import { XMLParser } from "fast-xml-parser";
import type { EntryInsert, FeedKind, Json } from "../src/lib/database.types.ts";

type IngestionEntry = Pick<
  EntryInsert,
  | "title"
  | "source_name"
  | "original_url"
  | "source_excerpt"
  | "feed_kind"
  | "published_at"
>;

type FeedDefinition = {
  id: string;
  sourceName: string;
  kind: FeedKind;
  url: string;
  format: "xml" | "hacker-news" | "reddit" | "hugging-face";
};

type FeedResult = {
  entries: IngestionEntry[];
  retries: number;
  diagnostics?: string[];
};

export type IngestionOptions = {
  lookbackDays?: number;
};

type FeedAnomaly = {
  feed: string;
  message: string;
  severity: "warning" | "error";
};

type CronRunStatus = "succeeded" | "partial" | "failed";

type IngestionSummary = {
  feedsParsed: number;
  entriesFound: number;
  entriesInserted: number;
  anomalies: FeedAnomaly[];
  status: CronRunStatus;
};

type JsonObject = Record<string, unknown>;

const dayAgo = 24 * 60 * 60 * 1000;
const requestTimeoutMs = 20_000;
const maximumExcerptLength = 12_000;
const xmlParser = new XMLParser({
  cdataPropName: "#cdata",
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  parseTagValue: false,
  trimValues: true,
});

const feeds: FeedDefinition[] = [
  {
    id: "openai",
    sourceName: "OpenAI",
    kind: "rss",
    url: "https://openai.com/news/rss.xml",
    format: "xml",
  },
  {
    id: "deepmind",
    sourceName: "Google DeepMind",
    kind: "rss",
    url: "https://deepmind.google/blog/rss.xml",
    format: "xml",
  },
  {
    id: "mistral",
    sourceName: "Mistral",
    kind: "rss",
    url: "https://mistral.ai/rss.xml",
    format: "xml",
  },
  {
    id: "hacker-news",
    sourceName: "Hacker News",
    kind: "hacker_news",
    url: "https://hn.algolia.com/api/v1/search_by_date",
    format: "hacker-news",
  },
  {
    id: "reddit-ml",
    sourceName: "r/MachineLearning",
    kind: "reddit",
    url: "https://www.reddit.com/r/MachineLearning/top.json?limit=100&t=day",
    format: "reddit",
  },
  {
    id: "reddit-localllama",
    sourceName: "r/LocalLLaMA",
    kind: "reddit",
    url: "https://www.reddit.com/r/LocalLLaMA/top.json?limit=100&t=day",
    format: "reddit",
  },
  {
    id: "hugging-face-papers",
    sourceName: "Hugging Face Daily Papers",
    kind: "hugging_face",
    url: "https://huggingface.co/api/daily_papers",
    format: "hugging-face",
  },
  {
    id: "arxiv-cs-ai",
    sourceName: "arXiv cs.AI",
    kind: "arxiv",
    url: "https://export.arxiv.org/api/query?search_query=cat%3Acs.AI&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending",
    format: "xml",
  },
  {
    id: "arxiv-cs-se",
    sourceName: "arXiv cs.SE",
    kind: "arxiv",
    url: "https://export.arxiv.org/api/query?search_query=cat%3Acs.SE&start=0&max_results=100&sortBy=submittedDate&sortOrder=descending",
    format: "xml",
  },
];

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (!isObject(value)) {
    return null;
  }
  for (const key of ["#text", "#cdata", "value"]) {
    const text = stringValue(value[key]);
    if (text) {
      return text;
    }
  }
  return null;
}

function cleanExcerpt(value: unknown): string | null {
  const text = stringValue(value);
  if (!text) {
    return null;
  }

  const cleaned = text
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)\s*>/gi, "\n")
    .replace(/<\/?[a-z][\w:-]*(?:\s[^<>]*?)?\s*\/?>/gi, " ")
    .replace(/<\/?[a-z][\w:-]*(?:\s[^<>]*)?$/gi, " ")
    .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned ? cleaned.slice(0, maximumExcerptLength) : null;
}

function parseDate(value: unknown): string | null {
  const text = stringValue(value);
  if (!text) {
    return null;
  }
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function canonicalUrl(value: unknown): string | null {
  const text = stringValue(value);
  if (!text || text.length > 2048) {
    return null;
  }

  try {
    const url = new URL(text);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }
    url.hash = "";
    const canonical = url.toString();
    return canonical.length <= 2048 ? canonical : null;
  } catch {
    return null;
  }
}

function inWindow(date: string | null, now: Date, lookbackDays: number): boolean {
  if (!date) {
    return false;
  }
  const timestamp = new Date(date).getTime();
  return (
    timestamp >= now.getTime() - lookbackDays * dayAgo &&
    timestamp <= now.getTime()
  );
}

function normalizeEntry(
  feed: FeedDefinition,
  titleValue: unknown,
  urlValue: unknown,
  publishedValue: unknown,
  excerptValue: unknown,
  now: Date,
  lookbackDays: number,
): IngestionEntry | null {
  const title = cleanExcerpt(titleValue)?.replace(/\s+/g, " ").trim() || null;
  const originalUrl = canonicalUrl(urlValue);
  const publishedAt = parseDate(publishedValue);

  if (
    !title ||
    title.length > 500 ||
    !originalUrl ||
    !publishedAt ||
    !inWindow(publishedAt, now, lookbackDays)
  ) {
    return null;
  }

  return {
    title,
    source_name: feed.sourceName,
    original_url: originalUrl,
    source_excerpt: cleanExcerpt(excerptValue),
    feed_kind: feed.kind,
    published_at: publishedAt,
  };
}

function atomLink(value: unknown): string | null {
  for (const link of asArray(value)) {
    if (isObject(link)) {
      const relation = stringValue(link["@_rel"]);
      const href = stringValue(link["@_href"]);
      if (href && (!relation || relation === "alternate")) {
        return href;
      }
    }
  }
  return stringValue(value);
}

export function parseXmlFeed(
  text: string,
  feed: FeedDefinition,
  now: Date,
  lookbackDays = 1,
): IngestionEntry[] {
  const parsed = xmlParser.parse(text);
  if (!isObject(parsed)) {
    throw new Error("The XML response did not contain a feed document.");
  }

  const rssItems = isObject(parsed.rss) && isObject(parsed.rss.channel)
    ? parsed.rss.channel.item
    : undefined;
  const atomEntries = isObject(parsed.feed) ? parsed.feed.entry : undefined;
  const items = rssItems ?? atomEntries;

  if (items === undefined) {
    throw new Error("The XML response did not contain RSS items or Atom entries.");
  }

  const result: IngestionEntry[] = [];
  for (const item of asArray(items)) {
    if (!isObject(item)) {
      continue;
    }
    const isAtom = atomEntries !== undefined && rssItems === undefined;
    const entry = normalizeEntry(
      feed,
      item.title,
      isAtom ? atomLink(item.link) : item.link,
      isAtom
        ? item.published ?? item.updated
        : item.pubDate ?? item.published ?? item.updated,
      item.description ?? item.summary,
      now,
      lookbackDays,
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseHackerNews(
  value: unknown,
  feed: FeedDefinition,
  now: Date,
  lookbackDays: number,
) {
  if (!isObject(value) || !Array.isArray(value.hits)) {
    throw new Error("Hacker News returned an invalid search response.");
  }

  const result: IngestionEntry[] = [];
  for (const hit of value.hits) {
    if (!isObject(hit)) {
      continue;
    }
    const points = typeof hit.points === "number" ? hit.points : 0;
    const postedAt = parseDate(hit.created_at);
    if (points <= 150 || !inWindow(postedAt, now, lookbackDays)) {
      continue;
    }
    const storyId = stringValue(hit.objectID);
    const url =
      hit.url ??
      hit.story_url ??
      (storyId
        ? `https://news.ycombinator.com/item?id=${encodeURIComponent(storyId)}`
        : null);
    const entry = normalizeEntry(
      feed,
      hit.title ?? hit.story_title,
      url,
      postedAt,
      null,
      now,
      lookbackDays,
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseReddit(
  value: unknown,
  feed: FeedDefinition,
  now: Date,
  lookbackDays: number,
) {
  if (
    !isObject(value) ||
    !isObject(value.data) ||
    !Array.isArray(value.data.children)
  ) {
    throw new Error("Reddit returned an invalid listing response.");
  }

  const result: IngestionEntry[] = [];
  for (const child of value.data.children) {
    if (!isObject(child) || !isObject(child.data)) {
      continue;
    }
    const post = child.data;
    if (post.stickied === true || typeof post.created_utc !== "number") {
      continue;
    }
    const postedAt = new Date(post.created_utc * 1000).toISOString();
    const permalink = stringValue(post.permalink);
    const entry = normalizeEntry(
      feed,
      post.title,
      permalink ? new URL(permalink, "https://www.reddit.com").toString() : null,
      postedAt,
      post.selftext,
      now,
      lookbackDays,
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseHuggingFace(
  value: unknown,
  feed: FeedDefinition,
  now: Date,
  lookbackDays: number,
) {
  if (!Array.isArray(value)) {
    throw new Error("Hugging Face returned an invalid daily-papers response.");
  }

  const result: IngestionEntry[] = [];
  for (const paper of value) {
    if (!isObject(paper) || !isObject(paper.paper)) {
      continue;
    }
    const details = paper.paper;
    const paperId = stringValue(details.id);
    const publishedAt =
      paper.submittedOnDailyAt ?? paper.publishedAt ?? details.publishedAt;
    const entry = normalizeEntry(
      feed,
      details.title,
      paperId ? `https://arxiv.org/abs/${encodeURIComponent(paperId)}` : null,
      publishedAt,
      details.summary,
      now,
      lookbackDays,
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function requestUrl(
  feed: FeedDefinition,
  now: Date,
  lookbackDays: number,
  dailyPaperDate?: string,
): URL {
  const url = new URL(feed.url);
  if (feed.format === "hacker-news") {
    url.searchParams.set("tags", "story");
    url.searchParams.set(
      "numericFilters",
      `points>150,created_at_i>${Math.floor((now.getTime() - lookbackDays * dayAgo) / 1000)}`,
    );
    url.searchParams.set("query", "AI OR LLM OR Machine Learning");
    url.searchParams.set("hitsPerPage", lookbackDays === 1 ? "100" : "1000");
  } else if (feed.format === "reddit") {
    url.searchParams.set("t", lookbackDays === 1 ? "day" : "month");
  } else if (feed.format === "hugging-face" && dailyPaperDate) {
    url.searchParams.set("date", dailyPaperDate);
  } else if (feed.kind === "arxiv" && lookbackDays > 1) {
    url.searchParams.set("max_results", "1000");
  }
  return url;
}

function dailyPaperDates(now: Date, lookbackDays: number): string[] {
  const start = new Date(now.getTime() - lookbackDays * dayAgo);
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const end = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dates: string[] = [];

  while (cursor.getTime() <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

const maximumFeedAttempts = 3;
const maximumRetryAfterMs = 10_000;

function retryDelay(response: Response, failedAttempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const retryAt = Date.parse(retryAfter);
    const requestedDelay = Number.isFinite(seconds)
      ? seconds * 1000
      : Number.isNaN(retryAt)
        ? null
        : retryAt - Date.now();
    if (requestedDelay !== null && requestedDelay >= 0) {
      return Math.min(requestedDelay, maximumRetryAfterMs);
    }
  }
  return 1000 * 2 ** (failedAttempt - 1);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function fetchWithRetry(
  url: URL,
  init: Omit<RequestInit, "signal">,
  fetcher: typeof fetch = fetch,
  wait: (delayMs: number) => Promise<void> = (delayMs) =>
    new Promise((resolve) => setTimeout(resolve, delayMs)),
): Promise<{ response: Response; retries: number }> {
  let retries = 0;

  for (let attempt = 1; attempt <= maximumFeedAttempts; attempt += 1) {
    let response: Response;
    try {
      response = await fetcher(url, {
        ...init,
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch (error) {
      if (attempt === maximumFeedAttempts) {
        throw new Error(
          `Network request failed after ${retries} ${retries === 1 ? "retry" : "retries"}: ${errorMessage(error)}`,
          { cause: error },
        );
      }
      retries += 1;
      await wait(1000 * 2 ** (attempt - 1));
      continue;
    }

    if (response.ok || !isRetryableStatus(response.status)) {
      return { response, retries };
    }

    if (attempt === maximumFeedAttempts) {
      return { response, retries };
    }

    retries += 1;
    await response.body?.cancel();
    await wait(retryDelay(response, attempt));
  }

  throw new Error("Feed retry loop ended without a response.");
}

async function fetchFeedAtUrl(
  feed: FeedDefinition,
  url: URL,
  now: Date,
  lookbackDays: number,
): Promise<FeedResult> {
  const { response, retries } = await fetchWithRetry(
    url,
    {
      headers: {
        accept:
          feed.format === "xml"
            ? "application/atom+xml, application/rss+xml, application/xml, text/xml"
            : "application/json",
        "user-agent": "AreWeCooked/1.0 (daily editorial ingestion)",
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} ${response.statusText}; failed after ${retries} ${retries === 1 ? "retry" : "retries"}`.trim(),
    );
  }

  if (feed.format === "xml") {
    return {
      entries: parseXmlFeed(
        await response.text(),
        feed,
        now,
        lookbackDays,
      ),
      retries,
    };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("The feed response was not valid JSON.");
  }
  if (feed.format === "hacker-news") {
    return { entries: parseHackerNews(json, feed, now, lookbackDays), retries };
  }
  if (feed.format === "reddit") {
    return { entries: parseReddit(json, feed, now, lookbackDays), retries };
  }
  return { entries: parseHuggingFace(json, feed, now, lookbackDays), retries };
}

async function fetchFeed(
  feed: FeedDefinition,
  now: Date,
  lookbackDays: number,
): Promise<FeedResult> {
  if (feed.format !== "hugging-face") {
    return fetchFeedAtUrl(
      feed,
      requestUrl(feed, now, lookbackDays),
      now,
      lookbackDays,
    );
  }

  const dates = dailyPaperDates(now, lookbackDays);
  const entries: IngestionEntry[] = [];
  const failedDates: string[] = [];
  let retries = 0;
  let successfulDates = 0;

  for (let start = 0; start < dates.length; start += 4) {
    const batch = dates.slice(start, start + 4);
    const results = await Promise.allSettled(
      batch.map((date) =>
        fetchFeedAtUrl(
          feed,
          requestUrl(feed, now, lookbackDays, date),
          now,
          lookbackDays,
        ),
      ),
    );

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulDates += 1;
        entries.push(...result.value.entries);
        retries += result.value.retries;
      } else {
        failedDates.push(batch[index]);
      }
    });
  }

  if (successfulDates === 0) {
    throw new Error(
      `All ${dates.length} daily-paper date requests failed (${failedDates.join(", ")}).`,
    );
  }

  return {
    entries,
    retries,
    ...(failedDates.length > 0
      ? {
          diagnostics: [
            `Daily-paper requests failed for ${failedDates.length} date${failedDates.length === 1 ? "" : "s"}: ${failedDates.join(", ")}.`,
          ],
        }
      : {}),
  };
}

function requireConfiguration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running ingestion.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(supabaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must be a valid URL.");
  }
  if (
    parsedUrl.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)
  ) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL must use HTTPS.");
  }

  return { supabaseUrl: parsedUrl.origin, serviceRoleKey };
}

async function supabaseRequest(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  prefer: string,
): Promise<unknown> {
  const { supabaseUrl, serviceRoleKey } = requireConfiguration();
  let response: Response;
  try {
    response = await fetch(new URL(`/rest/v1/${path}`, supabaseUrl), {
      method,
      headers: {
        apikey: serviceRoleKey,
        authorization: "Bearer " + serviceRoleKey,
        "content-type": "application/json",
        prefer,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new Error(
      `Supabase ${method} ${path} request failed: ${errorMessage(error)}`,
      { cause: error },
    );
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(
      `Supabase ${method} ${path} failed with HTTP ${response.status}: ${detail}`,
    );
  }

  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) : null;
}

async function createRun(startedAt: string): Promise<string> {
  const rows = await supabaseRequest(
    "cron_logs",
    "POST",
    [{ started_at: startedAt, status: "running" }],
    "return=representation",
  );
  if (
    !Array.isArray(rows) ||
    !isObject(rows[0]) ||
    typeof rows[0].id !== "string"
  ) {
    throw new Error("Supabase did not return an ID for the ingestion run log.");
  }
  return rows[0].id;
}

async function updateRun(
  id: string,
  summary: IngestionSummary,
  completedAt: string,
  errorMessage: string | null = null,
) {
  await supabaseRequest(
    `cron_logs?id=eq.${encodeURIComponent(id)}`,
    "PATCH",
    {
      completed_at: completedAt,
      feeds_parsed: summary.feedsParsed,
      entries_found: summary.entriesFound,
      entries_inserted: summary.entriesInserted,
      anomaly_count: summary.anomalies.length,
      anomalies: summary.anomalies as Json,
      status: summary.status,
      error_message: errorMessage,
    },
    "return=minimal",
  );
}

async function insertEntries(entries: IngestionEntry[]): Promise<number> {
  if (entries.length === 0) {
    return 0;
  }

  let inserted = 0;
  for (let start = 0; start < entries.length; start += 200) {
    const batch = entries.slice(start, start + 200);
    const rows = await supabaseRequest(
      "entries?on_conflict=original_url",
      "POST",
      batch,
      "resolution=ignore-duplicates,return=representation",
    );
    if (!Array.isArray(rows)) {
      throw new Error("Supabase returned an invalid inserted-entry response.");
    }
    inserted += rows.length;
  }
  return inserted;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "TimeoutError") {
      return "Request timed out after 20 seconds.";
    }
    if (error.cause instanceof Error) {
      const code =
        isObject(error.cause) && typeof error.cause.code === "string"
          ? ` (${error.cause.code})`
          : "";
      return `${error.message}: ${error.cause.message}${code}`;
    }
    return error.message;
  }
  return "An unknown ingestion error occurred.";
}

function uniqueEntries(entries: IngestionEntry[]): IngestionEntry[] {
  return [...new Map(entries.map((entry) => [entry.original_url, entry])).values()];
}

export async function runIngestion(
  now = new Date(),
  options: IngestionOptions = {},
): Promise<IngestionSummary> {
  const lookbackDays = options.lookbackDays ?? 1;
  if (
    !Number.isInteger(lookbackDays) ||
    lookbackDays < 1 ||
    lookbackDays > 30
  ) {
    throw new Error("The ingestion lookback must be a whole number from 1 to 30 days.");
  }

  requireConfiguration();
  const startedAt = now.toISOString();
  const runId = await createRun(startedAt);
  const summary: IngestionSummary = {
    feedsParsed: 0,
    entriesFound: 0,
    entriesInserted: 0,
    anomalies: [],
    status: "running" as CronRunStatus,
  };

  try {
    const results = await Promise.allSettled(
      feeds.map((feed) => fetchFeed(feed, now, lookbackDays)),
    );
    const candidates: IngestionEntry[] = [];

    results.forEach((result, index) => {
      const feed = feeds[index];
      if (result.status === "fulfilled") {
        summary.feedsParsed += 1;
        summary.entriesFound += result.value.entries.length;
        candidates.push(...result.value.entries);
        if (result.value.retries > 0) {
          summary.anomalies.push({
            feed: feed.id,
            message: `Feed recovered after ${result.value.retries} ${result.value.retries === 1 ? "retry" : "retries"}.`,
            severity: "warning",
          });
        }
        for (const message of result.value.diagnostics ?? []) {
          summary.anomalies.push({
            feed: feed.id,
            message,
            severity: "error",
          });
        }
      } else {
        summary.anomalies.push({
          feed: feed.id,
          message: errorMessage(result.reason),
          severity: "error",
        });
      }
    });

    summary.entriesInserted = await insertEntries(uniqueEntries(candidates));
    summary.status =
      summary.feedsParsed === 0
        ? "failed"
        : summary.anomalies.some((anomaly) => anomaly.severity === "error")
          ? "partial"
          : "succeeded";

    const finalError =
      summary.status === "failed"
        ? "Every configured feed failed to return valid data."
        : null;
    await updateRun(runId, summary, new Date().toISOString(), finalError);
    console.info(
      `${lookbackDays === 1 ? "Ingestion" : `Historical seed (${lookbackDays} days)`} ${summary.status}: ${summary.feedsParsed}/${feeds.length} feeds parsed, ${summary.entriesFound} entries found, ${summary.entriesInserted} inserted, ${summary.anomalies.length} feed ${summary.anomalies.length === 1 ? "diagnostic" : "diagnostics"}.`,
    );
    return summary;
  } catch (error) {
    summary.status = "failed";
    const message = errorMessage(error);
    try {
      await updateRun(runId, summary, new Date().toISOString(), message);
    } catch (logError) {
      throw new AggregateError(
        [error, logError],
        `Ingestion failed and its cron log could not be finalized: ${message}; ${errorMessage(logError)}`,
      );
    }
    throw error;
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  try {
    process.loadEnvFile(".env.local");
  } catch (error) {
    if (!isObject(error) || error.code !== "ENOENT") {
      console.error(
        "Could not load local ingestion environment:",
        errorMessage(error),
      );
      process.exitCode = 1;
    }
  }

  if (process.exitCode !== 1) {
    runIngestion()
      .then((summary) => {
        if (summary.status === "failed") {
          process.exitCode = 1;
        }
      })
      .catch((error: unknown) => {
        console.error("Daily ingestion failed:", errorMessage(error));
        process.exitCode = 1;
      });
  }
}
