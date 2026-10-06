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
};

type FeedAnomaly = {
  feed: string;
  message: string;
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
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
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

function inWindow(date: string | null, now: Date): boolean {
  if (!date) {
    return false;
  }
  const timestamp = new Date(date).getTime();
  return timestamp >= now.getTime() - dayAgo && timestamp <= now.getTime();
}

function normalizeEntry(
  feed: FeedDefinition,
  titleValue: unknown,
  urlValue: unknown,
  publishedValue: unknown,
  excerptValue: unknown,
  now: Date,
): IngestionEntry | null {
  const title = stringValue(titleValue);
  const originalUrl = canonicalUrl(urlValue);
  const publishedAt = parseDate(publishedValue);

  if (
    !title ||
    title.length > 500 ||
    !originalUrl ||
    !publishedAt ||
    !inWindow(publishedAt, now)
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
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseHackerNews(value: unknown, feed: FeedDefinition, now: Date) {
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
    if (points <= 150 || !inWindow(postedAt, now)) {
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
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseReddit(value: unknown, feed: FeedDefinition, now: Date) {
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
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function parseHuggingFace(value: unknown, feed: FeedDefinition, now: Date) {
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
    const publishedAt = paper.publishedAt ?? details.publishedAt;
    const entry = normalizeEntry(
      feed,
      details.title,
      paperId ? `https://arxiv.org/abs/${encodeURIComponent(paperId)}` : null,
      publishedAt,
      details.summary,
      now,
    );
    if (entry) {
      result.push(entry);
    }
  }
  return result;
}

function requestUrl(feed: FeedDefinition, now: Date): URL {
  const url = new URL(feed.url);
  if (feed.format === "hacker-news") {
    url.searchParams.set("tags", "story");
    url.searchParams.set(
      "numericFilters",
      `points>150,created_at_i>${Math.floor((now.getTime() - dayAgo) / 1000)}`,
    );
    url.searchParams.set("query", "AI OR LLM OR Machine Learning");
    url.searchParams.set("hitsPerPage", "100");
  }
  return url;
}

async function fetchFeed(
  feed: FeedDefinition,
  now: Date,
): Promise<FeedResult> {
  let response: Response;
  try {
    response = await fetch(requestUrl(feed, now), {
      headers: {
        accept:
          feed.format === "xml"
            ? "application/atom+xml, application/rss+xml, application/xml, text/xml"
            : "application/json",
        "user-agent": "AreWeCookedYet/1.0 (daily editorial ingestion)",
      },
      signal: AbortSignal.timeout(requestTimeoutMs),
    });
  } catch (error) {
    throw new Error(`Network request failed: ${errorMessage(error)}`, {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
  }

  if (feed.format === "xml") {
    return { entries: parseXmlFeed(await response.text(), feed, now) };
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new Error("The feed response was not valid JSON.");
  }
  if (feed.format === "hacker-news") {
    return { entries: parseHackerNews(json, feed, now) };
  }
  if (feed.format === "reddit") {
    return { entries: parseReddit(json, feed, now) };
  }
  return { entries: parseHuggingFace(json, feed, now) };
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

export async function runIngestion(now = new Date()): Promise<IngestionSummary> {
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
      feeds.map((feed) => fetchFeed(feed, now)),
    );
    const candidates: IngestionEntry[] = [];

    results.forEach((result, index) => {
      const feed = feeds[index];
      if (result.status === "fulfilled") {
        summary.feedsParsed += 1;
        summary.entriesFound += result.value.entries.length;
        candidates.push(...result.value.entries);
      } else {
        summary.anomalies.push({
          feed: feed.id,
          message: errorMessage(result.reason),
        });
      }
    });

    summary.entriesInserted = await insertEntries(uniqueEntries(candidates));
    summary.status =
      summary.feedsParsed === 0
        ? "failed"
        : summary.anomalies.length > 0
          ? "partial"
          : "succeeded";

    const finalError =
      summary.status === "failed"
        ? "Every configured feed failed to return valid data."
        : null;
    await updateRun(runId, summary, new Date().toISOString(), finalError);
    console.info(
      `Ingestion ${summary.status}: ${summary.feedsParsed}/${feeds.length} feeds parsed, ${summary.entriesFound} entries found, ${summary.entriesInserted} inserted, ${summary.anomalies.length} anomalies.`,
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
