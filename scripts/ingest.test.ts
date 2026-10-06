import assert from "node:assert/strict";
import test from "node:test";
import type { FeedKind } from "../src/lib/database.types.ts";
import { fetchWithRetry, parseXmlFeed, runIngestion } from "./ingest.ts";

const now = new Date("2026-10-06T12:00:00.000Z");
const feed = {
  id: "test-feed",
  sourceName: "Test Source",
  kind: "rss" as FeedKind,
  url: "https://example.com/rss.xml",
  format: "xml" as const,
};

test("parses recent RSS entries and strips markup from source excerpts", () => {
  const entries = parseXmlFeed(
    `<rss version="2.0"><channel><item>
      <title><![CDATA[New model <b>release</b>]]></title>
      <link>https://example.com/story#section</link>
      <pubDate>Tue, 06 Oct 2026 11:00:00 GMT</pubDate>
      <description><![CDATA[Original <em>source</em> excerpt]]></description>
    </item></channel></rss>`,
    feed,
    now,
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "New model release");
  assert.equal(entries[0].original_url, "https://example.com/story");
  assert.equal(entries[0].source_excerpt, "Original source excerpt");
});

test("sanitizes untrusted feed titles and drops unsafe or empty entries", () => {
  const entries = parseXmlFeed(
    `<rss version="2.0"><channel>
      <item>
        <title><![CDATA[New <b>model</b>\u0000 &amp; tools<script>alert(1)</script>]]></title>
        <link>https://example.com/safe</link>
        <pubDate>Tue, 06 Oct 2026 11:00:00 GMT</pubDate>
        <description><![CDATA[<script>alert("x")</script><p>Safe excerpt</p>]]></description>
      </item>
      <item>
        <title><![CDATA[<script>alert(1)</script>]]></title>
        <link>https://example.com/empty-title</link>
        <pubDate>Tue, 06 Oct 2026 11:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Unsafe destination</title>
        <link>javascript:alert(1)</link>
        <pubDate>Tue, 06 Oct 2026 11:00:00 GMT</pubDate>
      </item>
    </channel></rss>`,
    feed,
    now,
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "New model & tools");
  assert.equal(entries[0].source_excerpt, "Safe excerpt");
  assert.equal(entries[0].original_url, "https://example.com/safe");
});

test("keeps excerpt text readable when HTML fragments are incomplete or contain comparisons", () => {
  const entries = parseXmlFeed(
    `<rss version="2.0"><channel><item>
      <title>Research note</title>
      <link>https://example.com/research</link>
      <pubDate>Tue, 06 Oct 2026 11:00:00 GMT</pubDate>
      <description><![CDATA[<p>Models with score < 0.5 perform &amp; generalize.</p><p>Next paragraph<br>with a line break. <img src="/partial]]></description>
    </item></channel></rss>`,
    feed,
    now,
  );

  assert.equal(
    entries[0].source_excerpt,
    "Models with score < 0.5 perform & generalize.\nNext paragraph\nwith a line break.",
  );
});

test("parses Atom alternate links and ignores entries outside the 24-hour window", () => {
  const entries = parseXmlFeed(
    `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <title>Recent paper</title>
        <link rel="alternate" href="https://example.com/recent" />
        <published>2026-10-06T11:30:00Z</published>
        <summary>Recent source summary</summary>
      </entry>
      <entry>
        <title>Old paper</title>
        <link href="https://example.com/old" />
        <updated>2026-10-05T11:00:00Z</updated>
      </entry>
    </feed>`,
    { ...feed, kind: "arxiv" },
    now,
  );

  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "Recent paper");
  assert.equal(entries[0].original_url, "https://example.com/recent");
  assert.equal(entries[0].feed_kind, "arxiv");
});

test("rejects malformed XML that does not contain feed entries", () => {
  assert.throws(
    () => parseXmlFeed("<html>not a feed</html>", feed, now),
    /did not contain RSS items or Atom entries/,
  );
});

test("retries transient server responses using Retry-After and reports recovered attempts", async () => {
  let attempts = 0;
  const waits: number[] = [];
  const result = await fetchWithRetry(
    new URL("https://example.com/feed.xml"),
    {},
    async (_input, init) => {
      attempts += 1;
      assert.ok(init?.signal);
      return attempts === 1
        ? new Response("temporarily unavailable", {
            status: 503,
            headers: { "retry-after": "0" },
          })
        : new Response("feed", { status: 200 });
    },
    async (delayMs) => {
      waits.push(delayMs);
    },
  );

  assert.equal(result.response.status, 200);
  assert.equal(result.retries, 1);
  assert.equal(attempts, 2);
  assert.deepEqual(waits, [0]);
});

test("does not retry permanent client errors", async () => {
  let attempts = 0;
  const result = await fetchWithRetry(
    new URL("https://example.com/feed.xml"),
    {},
    async () => {
      attempts += 1;
      return new Response("not found", { status: 404 });
    },
    async () => {
      assert.fail("Permanent client errors should not be retried.");
    },
  );

  assert.equal(result.response.status, 404);
  assert.equal(result.retries, 0);
  assert.equal(attempts, 1);
});

test("caps transient retries at two retries after the initial request", async () => {
  let attempts = 0;
  const result = await fetchWithRetry(
    new URL("https://example.com/feed.xml"),
    {},
    async () => {
      attempts += 1;
      return new Response("temporarily unavailable", { status: 503 });
    },
    async () => {},
  );

  assert.equal(result.response.status, 503);
  assert.equal(result.retries, 2);
  assert.equal(attempts, 3);
});

test("runs all feed adapters, deduplicates URLs, inserts pending entries, and logs telemetry", async () => {
  const originalFetch = globalThis.fetch;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const nowSeconds = Math.floor(now.getTime() / 1000);
  let openAiAttempts = 0;
  const completedRuns: Record<string, unknown>[] = [];
  const feedRequests: URL[] = [];
  const insertedEntries: Record<string, unknown>[] = [];
  const storedUrls = new Set<string>();

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === "project.example") {
      if (url.pathname.endsWith("/cron_logs") && init?.method === "POST") {
        return Response.json([{ id: "test-run-id" }]);
      }
      if (url.pathname.endsWith("/cron_logs") && init?.method === "PATCH") {
        completedRuns.push(JSON.parse(String(init.body)) as Record<string, unknown>);
        return new Response(null, { status: 204 });
      }
      if (url.pathname.endsWith("/entries") && init?.method === "POST") {
        const entries = JSON.parse(String(init.body)) as Record<string, unknown>[];
        const newEntries = entries.filter((entry) => {
          const originalUrl = entry.original_url;
          if (typeof originalUrl !== "string" || storedUrls.has(originalUrl)) {
            return false;
          }
          storedUrls.add(originalUrl);
          insertedEntries.push(entry);
          return true;
        });
        return Response.json(newEntries);
      }
      throw new Error(`Unexpected Supabase request: ${init?.method} ${url.pathname}`);
    }

    feedRequests.push(url);
    if (url.hostname === "hn.algolia.com") {
      return Response.json({
        hits: [
          {
            created_at: now.toISOString(),
            objectID: "hn-below-threshold",
            points: 150,
            title: "Below Hacker News score threshold",
            url: "https://example.com/hn-below-threshold",
          },
          {
            created_at: now.toISOString(),
            objectID: "hn-1",
            points: 200,
            title: "Hacker News item",
            url: "https://example.com/hn",
          },
          {
            created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
            objectID: "hn-old",
            points: 500,
            title: "Outside the Hacker News window",
            url: "https://example.com/hn-old",
          },
          {
            created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            objectID: "hn-historic",
            points: 200,
            title: "Historical Hacker News item",
            url: "https://example.com/hn-historic",
          },
          {
            created_at: new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000).toISOString(),
            objectID: "hn-outside-seed",
            points: 500,
            title: "Outside the seed window",
            url: "https://example.com/hn-outside-seed",
          },
        ],
      });
    }
    if (url.hostname === "www.reddit.com") {
      const subreddit = url.pathname.includes("LocalLLaMA")
        ? "LocalLLaMA"
        : "MachineLearning";
      return Response.json({
        data: {
          children: [
            {
              data: {
                created_utc: nowSeconds - 60,
                permalink: `/r/${subreddit}/comments/post-1`,
                score: 1,
                selftext: "",
                stickied: false,
                title: `${subreddit} post`,
              },
            },
            {
              data: {
                created_utc: nowSeconds - 25 * 60 * 60,
                permalink: `/r/${subreddit}/comments/post-old`,
                score: 100,
                selftext: "",
                stickied: false,
                title: `${subreddit} post outside the time window`,
              },
            },
            {
              data: {
                created_utc: nowSeconds - 20 * 24 * 60 * 60,
                permalink: `/r/${subreddit}/comments/post-historic`,
                score: 1,
                selftext: "",
                stickied: false,
                title: `${subreddit} historical post`,
              },
            },
            {
              data: {
                created_utc: nowSeconds - 31 * 24 * 60 * 60,
                permalink: `/r/${subreddit}/comments/post-outside-seed`,
                score: 100,
                selftext: "",
                stickied: false,
                title: `${subreddit} post outside the seed window`,
              },
            },
            {
              data: {
                created_utc: nowSeconds - 60,
                permalink: `/r/${subreddit}/comments/post-stickied`,
                score: 100,
                selftext: "",
                stickied: true,
                title: `${subreddit} stickied post`,
              },
            },
          ],
        },
      });
    }
    if (url.hostname === "huggingface.co") {
      const paperDate = url.searchParams.get("date");
      if (paperDate !== "2026-10-06" && paperDate !== "2026-09-10") {
        return Response.json([]);
      }
      return Response.json([
        {
          paper: {
            id: paperDate === "2026-10-06" ? "2610.12345" : "2609.98765",
            publishedAt: "2026-10-01T00:00:00.000Z",
            summary: "Original paper abstract",
            title: paperDate === "2026-10-06" ? "Hugging Face paper" : "Historical Hugging Face paper",
          },
          submittedOnDailyAt: `${paperDate}T00:00:00.000Z`,
        },
      ]);
    }
    if (url.hostname === "openai.com" && openAiAttempts++ === 0) {
      return new Response("temporarily unavailable", {
        status: 503,
        headers: { "retry-after": "0" },
      });
    }

    return new Response(
      `<rss version="2.0"><channel><item>
        <title>Shared research article</title>
        <link>https://example.com/shared</link>
        <pubDate>${now.toUTCString()}</pubDate>
      </item></channel></rss>`,
      { headers: { "content-type": "application/xml" } },
    );
  };

  try {
    const summary = await runIngestion(now);
    assert.equal(summary.status, "succeeded");
    assert.equal(summary.feedsParsed, 9);
    assert.equal(summary.entriesFound, 9);
    assert.equal(summary.entriesInserted, 5);
    const dailyInsertedCount = insertedEntries.length;
    const hackerNewsRequest = feedRequests.find(
      (url) => url.hostname === "hn.algolia.com",
    );
    assert.ok(hackerNewsRequest);
    assert.equal(hackerNewsRequest.searchParams.get("tags"), "story");
    assert.equal(
      hackerNewsRequest.searchParams.get("numericFilters"),
      `points>150,created_at_i>${nowSeconds - 24 * 60 * 60}`,
    );
    assert.equal(
      hackerNewsRequest.searchParams.get("query"),
      "AI OR LLM OR Machine Learning",
    );
    assert.equal(hackerNewsRequest.searchParams.get("hitsPerPage"), "100");

    const redditRequests = feedRequests.filter(
      (url) => url.hostname === "www.reddit.com",
    );
    assert.equal(redditRequests.length, 2);
    for (const request of redditRequests) {
      assert.equal(request.searchParams.get("t"), "day");
      assert.equal(request.searchParams.get("limit"), "100");
    }
    const redditEntries = insertedEntries.filter(
      (entry) => entry.feed_kind === "reddit",
    );
    assert.equal(redditEntries.length, 2);
    assert.deepEqual(
      redditEntries.map((entry) => entry.title).sort(),
      ["LocalLLaMA post", "MachineLearning post"],
    );
    const dailyPaperRequests = feedRequests.filter(
      (url) => url.hostname === "huggingface.co",
    );
    assert.deepEqual(
      dailyPaperRequests.map((url) => url.searchParams.get("date")).sort(),
      ["2026-10-05", "2026-10-06"],
    );

    const seedSummary = await runIngestion(now, { lookbackDays: 30 });
    assert.equal(seedSummary.status, "succeeded");
    assert.equal(seedSummary.feedsParsed, 9);
    assert.equal(seedSummary.entriesFound, 16);
    assert.equal(seedSummary.entriesInserted, 7);
    assert.deepEqual(seedSummary.anomalies, []);
    const seedHackerNewsRequest = feedRequests.find(
      (url) =>
        url.hostname === "hn.algolia.com" &&
        url.searchParams.get("hitsPerPage") === "1000",
    );
    assert.ok(seedHackerNewsRequest);
    assert.equal(
      seedHackerNewsRequest.searchParams.get("numericFilters"),
      `points>150,created_at_i>${nowSeconds - 30 * 24 * 60 * 60}`,
    );
    const seedRedditRequests = feedRequests.filter(
      (url) =>
        url.hostname === "www.reddit.com" &&
        url.searchParams.get("t") === "month",
    );
    assert.equal(seedRedditRequests.length, 2);
    const seedPaperDates = feedRequests
      .filter((url) => url.hostname === "huggingface.co")
      .slice(dailyPaperRequests.length)
      .map((url) => url.searchParams.get("date"));
    assert.equal(seedPaperDates.length, 31);
    assert.ok(seedPaperDates.includes("2026-09-06"));
    assert.ok(seedPaperDates.includes("2026-10-06"));
    assert.equal(
      insertedEntries.length - dailyInsertedCount,
      seedSummary.entriesInserted,
    );
    assert.equal(
      insertedEntries.filter((entry) =>
        /historical/i.test(String(entry.title)),
      ).length,
      4,
    );
    assert.deepEqual(summary.anomalies, [
      {
        feed: "openai",
        message: "Feed recovered after 1 retry.",
        severity: "warning",
      },
    ]);
    assert.equal(completedRuns[0]?.status, "succeeded");
    assert.equal(completedRuns[0]?.anomaly_count, 1);
    assert.equal(completedRuns[1]?.status, "succeeded");
    assert.equal(completedRuns[1]?.anomaly_count, 0);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    } else {
      process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    }
    if (originalKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }
  }
});
