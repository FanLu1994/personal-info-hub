import { insertArticle, updateSourceStatus } from "../db";
import type { FetchResult } from "../types";
import { safeFetch } from "./allowed-hosts";
import crypto from "crypto";

const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL = (id: number) => `https://hacker-news.firebaseio.com/v0/item/${id}.json`;

interface HNItem {
  id: number;
  title?: string;
  url?: string;
  by?: string;
  time?: number;
  score?: number;
  descendants?: number;
  text?: string;
  type?: string;
}

function generateId(hnId: number): string {
  return crypto.createHash("md5").update(`hn:${hnId}`).digest("hex");
}

function escapeHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchHackerNews(): Promise<FetchResult> {
  let itemsAdded = 0;

  try {
    const response = await safeFetch(HN_TOP_STORIES_URL);

    if (!response.ok) {
      const error = `HTTP ${response.status}`;
      updateSourceStatus("hackernews", false, error);
      return { success: false, itemsAdded: 0, error };
    }

    const topIds: number[] = await response.json();
    const top30Ids = topIds.slice(0, 30);

    const items = await Promise.all(
      top30Ids.map(async (id) => {
        try {
          const itemResponse = await safeFetch(HN_ITEM_URL(id));
          if (!itemResponse.ok) return null;
          return (await itemResponse.json()) as HNItem;
        } catch {
          return null;
        }
      })
    );

    for (const item of items) {
      if (!item || !item.title) continue;

      const hnUrl = `https://news.ycombinator.com/item?id=${item.id}`;
      const articleUrl = item.url || hnUrl;

      let summary = "";
      if (item.text) {
        summary = escapeHtml(item.text).slice(0, 500);
      }
      if (item.score) {
        summary = `[${item.score} points] ${summary}`.trim();
      }

      const article = {
        id: generateId(item.id),
        source_type: "hackernews" as const,
        source_name: "Hacker News",
        category: "热门帖子",
        title: item.title,
        summary: summary || null,
        content: null,
        url: articleUrl,
        author: item.by || null,
        published_at: item.time ? new Date(item.time * 1000).toISOString() : null,
        raw_data: JSON.stringify({
          hn_id: item.id,
          hn_url: hnUrl,
          original_url: item.url,
          score: item.score,
          comments: item.descendants,
        }),
        is_raw_headline: 1,
      };

      insertArticle(article);
      itemsAdded++;
    }

    updateSourceStatus("hackernews", true, undefined, itemsAdded);
    return { success: true, itemsAdded };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    updateSourceStatus("hackernews", false, error);
    return { success: false, itemsAdded: 0, error };
  }
}
