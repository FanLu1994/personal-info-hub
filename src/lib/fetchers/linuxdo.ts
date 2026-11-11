import Parser from "rss-parser";
import { insertArticle, updateSourceStatus } from "../db";
import type { FetchResult } from "../types";
import { safeFetch } from "./allowed-hosts";
import crypto from "crypto";

const LINUXDO_RSS_URL = "https://linux.do/top.rss?period=daily";

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "InfoDigest/1.0 (Personal Information Aggregator)",
  },
});

function generateId(url: string): string {
  return crypto.createHash("md5").update(`linuxdo:${url}`).digest("hex");
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

export async function fetchLinuxdoTopics(): Promise<FetchResult> {
  let itemsAdded = 0;

  try {
    const response = await safeFetch(LINUXDO_RSS_URL);

    if (!response.ok) {
      const error = `HTTP ${response.status}`;
      updateSourceStatus("linuxdo", false, error);
      return { success: false, itemsAdded: 0, error };
    }

    const xml = await response.text();
    const parsed = await parser.parseString(xml);

    for (const item of parsed.items) {
      if (!item.title || !item.link) continue;

      const summary = extractText(item.content || item.contentSnippet || item.description);

      const article = {
        id: generateId(item.link),
        source_type: "linuxdo" as const,
        source_name: "Linux.do",
        category: "热门讨论",
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

    updateSourceStatus("linuxdo", true, undefined, itemsAdded);
    return { success: true, itemsAdded };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateSourceStatus("linuxdo", false, error);
    return { success: false, itemsAdded: 0, error };
  }
}
