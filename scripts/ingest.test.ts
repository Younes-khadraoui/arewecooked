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
  assert.equal(entries[0].title, "New model <b>release</b>");
  assert.equal(entries[0].original_url, "https://example.com/story");
  assert.equal(entries[0].source_excerpt, "Original source excerpt");
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
        const entries = JSON.parse(String(init.body)) as unknown[];
        return Response.json(entries);
      }
      throw new Error(`Unexpected Supabase request: ${init?.method} ${url.pathname}`);
    }

    if (url.hostname === "hn.algolia.com") {
      return Response.json({
        hits: [
          {
            created_at: now.toISOString(),
            objectID: "hn-1",
            points: 200,
            title: "Hacker News item",
            url: "https://example.com/hn",
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
                selftext: "",
                stickied: false,
                title: `${subreddit} post`,
              },
            },
          ],
        },
      });
    }
    if (url.hostname === "huggingface.co") {
      return Response.json([
        {
          paper: {
            id: "2610.12345",
            publishedAt: now.toISOString(),
            summary: "Original paper abstract",
            title: "Hugging Face paper",
          },
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
    assert.deepEqual(summary.anomalies, [
      {
        feed: "openai",
        message: "Feed recovered after 1 retry.",
        severity: "warning",
      },
    ]);
    assert.equal(completedRuns[0]?.status, "succeeded");
    assert.equal(completedRuns[0]?.anomaly_count, 1);
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
