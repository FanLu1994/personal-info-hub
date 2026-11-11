import Parser from "rss-parser";
import { RSS_FEEDS } from "../rss-feeds";
import { insertArticle, updateSourceStatus } from "../db";
import type { FetchResult } from "../types";
import { safeFetch } from "./allowed-hosts";
import crypto from "crypto";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "InfoDigest/1.0 (Personal Information Aggregator)",
  },
  customFields: {
    item: ["content:encoded", "description", "summary"],
  },
});

function generateId(url: string, title: string): string {
  return crypto.createHash("md5").update(`${url}:${title}`).digest("hex");
}

function extractText(html: string | undefined): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

export async function fetchRssFeeds(): Promise<FetchResult> {
  let itemsAdded = 0;
  const errors: string[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await safeFetch(feed.url);
      if (!response.ok) {
        errors.push(`${feed.name || feed.url}: HTTP ${response.status}`);
        continue;
      }

      const xml = await response.text();
      const parsed = await parser.parseString(xml);

      const feedTitle = feed.name || parsed.title || new URL(feed.url).hostname;

      for (const item of parsed.items.slice(0, 20)) {
        if (!item.title || !item.link) continue;

        const summary = extractText(
          item["content:encoded"] || item.content || item.description || item.summary
        );

        const article = {
          id: generateId(item.link, item.title),
          source_type: "rss" as const,
          source_name: feedTitle,
          category: feed.category,
          title: item.title,
          summary: summary || null,
          content: null,
          url: item.link,
          author: item.creator || null,
          published_at: item.isoDate || item.pubDate || null,
          raw_data: null,
          is_raw_headline: 1,
        };

        insertArticle(article);
        itemsAdded++;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      errors.push(`${feed.name || feed.url}: ${errorMsg}`);
    }
  }

  const success = errors.length < RSS_FEEDS.length;
  const errorSummary = errors.length > 0 ? `${errors.length} feeds failed` : undefined;

  updateSourceStatus("rss", success, errorSummary, itemsAdded);

  return {
    success,
    itemsAdded,
    error: errorSummary,
  };
}
