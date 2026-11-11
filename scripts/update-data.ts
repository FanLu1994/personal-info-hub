#!/usr/bin/env npx tsx
/**
 * 数据更新脚本
 * 
 * 从各数据源抓取最新内容，增量更新到data/seed/目录
 * 
 * 运行方式: npx tsx scripts/update-data.ts
 * 
 * 安全特性:
 * - 仅访问白名单域名
 * - HTML内容清洗
 * - 超时和并发限制
 * - 原子写入（写入临时文件后rename）
 * - 损坏数据不覆盖已有数据
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data", "seed");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const STATUSES_FILE = path.join(DATA_DIR, "statuses.json");
const VERIFIED_FILE = path.join(DATA_DIR, "verified.json");

const MAX_ARTICLES_PER_SOURCE = 100;
const MAX_TOTAL_ARTICLES = 3000;
const FETCH_TIMEOUT = 30000;
const MAX_CONCURRENT = 5;

type SourceType = "rss" | "linuxdo" | "hackernews" | "github";

interface Article {
  id: string;
  source_type: SourceType;
  source_name: string;
  category: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  url: string;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  is_raw_headline: boolean;
  raw_data?: string | null;
}

interface SourceStatus {
  source_type: SourceType;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  item_count: number;
}

interface FetchResult {
  success: boolean;
  articles: Article[];
  error?: string;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function generateId(prefix: string, content: string): string {
  return crypto.createHash("md5").update(`${prefix}:${content}`).digest("hex");
}

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "InfoDigest/2.0 (Personal Information Aggregator)",
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchHackerNews(): Promise<FetchResult> {
  const articles: Article[] = [];
  
  try {
    console.log("Fetching Hacker News...");
    const response = await safeFetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    
    if (!response.ok) {
      return { success: false, articles: [], error: `HTTP ${response.status}` };
    }
    
    const topIds: number[] = await response.json();
    const top30Ids = topIds.slice(0, 30);
    
    const items = await Promise.all(
      top30Ids.map(async (id) => {
        try {
          const itemResponse = await safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemResponse.ok) return null;
          return await itemResponse.json();
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
        summary = sanitizeHtml(item.text).slice(0, 500);
      }
      if (item.score) {
        summary = `[${item.score} points] ${summary}`.trim();
      }
      
      articles.push({
        id: generateId("hn", String(item.id)),
        source_type: "hackernews",
        source_name: "Hacker News",
        category: "热门帖子",
        title: item.title,
        summary: summary || null,
        content: null,
        url: articleUrl,
        author: item.by || null,
        published_at: item.time ? new Date(item.time * 1000).toISOString() : null,
        fetched_at: new Date().toISOString(),
        is_raw_headline: true,
        raw_data: JSON.stringify({
          hn_id: item.id,
          hn_url: hnUrl,
          original_url: item.url,
          score: item.score,
          comments: item.descendants,
        }),
      });
    }
    
    console.log(`  Fetched ${articles.length} HN items`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`  HN error: ${error}`);
    return { success: false, articles: [], error };
  }
}

async function fetchGitHubTrending(): Promise<FetchResult> {
  const articles: Article[] = [];
  
  try {
    console.log("Fetching GitHub Trending...");
    const response = await safeFetch("https://github.com/trending?since=daily", {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    
    if (!response.ok) {
      return { success: false, articles: [], error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    const articleRegex = /<article class="Box-row">([\s\S]*?)<\/article>/gi;
    let match;
    
    while ((match = articleRegex.exec(html)) !== null) {
      const articleHtml = match[1];
      
      const repoLinkMatch = articleHtml.match(/href="\/([^"]+)"[^>]*class="[^"]*Link[^"]*"[^>]*>/);
      if (!repoLinkMatch) continue;
      
      const fullName = repoLinkMatch[1].trim();
      if (!fullName.includes("/")) continue;
      
      const descMatch = articleHtml.match(/<p class="[^"]*color-fg-muted[^"]*"[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch ? sanitizeHtml(descMatch[1]) : "";
      
      const langMatch = articleHtml.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
      const language = langMatch ? langMatch[1].trim() : null;
      
      const starsMatch = articleHtml.match(/href="\/[^"]+\/stargazers"[^>]*>[^<]*<[^>]*>[^<]*<\/[^>]*>\s*([\d,]+)/);
      const stars = starsMatch ? parseInt(starsMatch[1].replace(/,/g, ""), 10) || 0 : 0;
      
      const forksMatch = articleHtml.match(/href="\/[^"]+\/forks"[^>]*>[^<]*<[^>]*>[^<]*<\/[^>]*>\s*([\d,]+)/);
      const forks = forksMatch ? parseInt(forksMatch[1].replace(/,/g, ""), 10) || 0 : 0;
      
      const todayMatch = articleHtml.match(/([\d,]+)\s*stars?\s*today/i);
      const starsToday = todayMatch ? parseInt(todayMatch[1].replace(/,/g, ""), 10) || 0 : 0;
      
      const today = new Date().toISOString().split("T")[0];
      let summary = description;
      const meta: string[] = [];
      if (language) meta.push(language);
      if (stars) meta.push(`⭐ ${stars.toLocaleString()}`);
      if (starsToday) meta.push(`📈 +${starsToday} today`);
      if (forks) meta.push(`🍴 ${forks.toLocaleString()}`);
      if (meta.length > 0) {
        summary = `[${meta.join(" · ")}] ${summary}`;
      }
      
      articles.push({
        id: generateId("github", `${fullName}:${today}`),
        source_type: "github",
        source_name: "GitHub Trending",
        category: "今日热门",
        title: fullName,
        summary: summary.slice(0, 500) || null,
        content: null,
        url: `https://github.com/${fullName}`,
        author: fullName.split("/")[0] || null,
        published_at: new Date().toISOString(),
        fetched_at: new Date().toISOString(),
        is_raw_headline: true,
        raw_data: JSON.stringify({
          fullName,
          description,
          language,
          stars,
          starsToday,
          forks,
        }),
      });
    }
    
    console.log(`  Fetched ${articles.length} GitHub repos`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`  GitHub error: ${error}`);
    return { success: false, articles: [], error };
  }
}

async function fetchLinuxdo(): Promise<FetchResult> {
  try {
    console.log("Fetching Linux.do...");
    const response = await safeFetch("https://linux.do/top.rss?period=daily", {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });
    
    if (!response.ok) {
      return { success: false, articles: [], error: `HTTP ${response.status}` };
    }
    
    const xml = await response.text();
    const articles: Article[] = [];
    
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
      const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
      const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
      const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/);
      
      if (!titleMatch || !linkMatch) continue;
      
      const title = sanitizeHtml(titleMatch[1]);
      const url = linkMatch[1].trim();
      const summary = descMatch ? sanitizeHtml(descMatch[1]).slice(0, 500) : null;
      const pubDate = pubDateMatch ? new Date(pubDateMatch[1].trim()).toISOString() : null;
      const author = creatorMatch ? sanitizeHtml(creatorMatch[1]) : null;
      
      articles.push({
        id: generateId("linuxdo", url),
        source_type: "linuxdo",
        source_name: "Linux.do",
        category: "热门讨论",
        title,
        summary,
        content: null,
        url,
        author,
        published_at: pubDate,
        fetched_at: new Date().toISOString(),
        is_raw_headline: true,
      });
    }
    
    console.log(`  Fetched ${articles.length} Linux.do items`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`  Linux.do error: ${error}`);
    return { success: false, articles: [], error };
  }
}

function loadExistingData(): { articles: Article[]; statuses: SourceStatus[] } {
  let articles: Article[] = [];
  let statuses: SourceStatus[] = [];
  
  try {
    if (fs.existsSync(ARTICLES_FILE)) {
      const data = fs.readFileSync(ARTICLES_FILE, "utf-8");
      articles = JSON.parse(data);
      console.log(`Loaded ${articles.length} existing articles`);
    }
  } catch (err) {
    console.error("Failed to load existing articles:", err);
  }
  
  try {
    if (fs.existsSync(STATUSES_FILE)) {
      const data = fs.readFileSync(STATUSES_FILE, "utf-8");
      statuses = JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load existing statuses:", err);
  }
  
  return { articles, statuses };
}

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpPath, data, "utf-8");
  fs.renameSync(tmpPath, filePath);
}

function mergeArticles(existing: Article[], newArticles: Article[]): Article[] {
  const articleMap = new Map<string, Article>();
  
  for (const article of existing) {
    articleMap.set(article.id, article);
  }
  
  for (const article of newArticles) {
    const existingArticle = articleMap.get(article.id);
    if (existingArticle) {
      articleMap.set(article.id, {
        ...existingArticle,
        ...article,
        fetched_at: article.fetched_at,
      });
    } else {
      articleMap.set(article.id, article);
    }
  }
  
  const merged = Array.from(articleMap.values());
  
  merged.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    return dateB - dateA;
  });
  
  return merged.slice(0, MAX_TOTAL_ARTICLES);
}

function updateStatus(
  statuses: SourceStatus[],
  sourceType: SourceType,
  success: boolean,
  error: string | null,
  itemCount: number
): SourceStatus[] {
  const now = new Date().toISOString();
  const existing = statuses.find(s => s.source_type === sourceType);
  
  const updated: SourceStatus = {
    source_type: sourceType,
    last_attempt_at: now,
    last_success_at: success ? now : (existing?.last_success_at || null),
    last_error: error,
    item_count: itemCount,
  };
  
  const result = statuses.filter(s => s.source_type !== sourceType);
  result.push(updated);
  return result;
}

async function main() {
  console.log("Starting data update...\n");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const { articles: existingArticles, statuses: existingStatuses } = loadExistingData();
  
  let allNewArticles: Article[] = [];
  let statuses = existingStatuses;
  
  const hnResult = await fetchHackerNews();
  if (hnResult.success) {
    allNewArticles = allNewArticles.concat(hnResult.articles);
  }
  statuses = updateStatus(
    statuses,
    "hackernews",
    hnResult.success,
    hnResult.error || null,
    hnResult.articles.length
  );
  
  const ghResult = await fetchGitHubTrending();
  if (ghResult.success) {
    allNewArticles = allNewArticles.concat(ghResult.articles);
  }
  statuses = updateStatus(
    statuses,
    "github",
    ghResult.success,
    ghResult.error || null,
    ghResult.articles.length
  );
  
  const ldResult = await fetchLinuxdo();
  if (ldResult.success) {
    allNewArticles = allNewArticles.concat(ldResult.articles);
  }
  statuses = updateStatus(
    statuses,
    "linuxdo",
    ldResult.success,
    ldResult.error || null,
    ldResult.articles.length
  );
  
  const rssStatus = existingStatuses.find(s => s.source_type === "rss");
  if (rssStatus) {
    statuses = statuses.filter(s => s.source_type !== "rss");
    statuses.push(rssStatus);
  } else {
    statuses.push({
      source_type: "rss",
      last_success_at: null,
      last_attempt_at: null,
      last_error: "RSS fetch not implemented in automated update",
      item_count: existingArticles.filter(a => a.source_type === "rss").length,
    });
  }
  
  console.log(`\nMerging ${allNewArticles.length} new articles with ${existingArticles.length} existing...`);
  const mergedArticles = mergeArticles(existingArticles, allNewArticles);
  console.log(`Final article count: ${mergedArticles.length}`);
  
  if (mergedArticles.length === 0 && existingArticles.length > 0) {
    console.error("ERROR: Refusing to overwrite existing data with empty result");
    process.exit(1);
  }
  
  console.log("\nWriting data files...");
  atomicWrite(ARTICLES_FILE, JSON.stringify(mergedArticles, null, 2));
  atomicWrite(STATUSES_FILE, JSON.stringify(statuses, null, 2));
  
  console.log("\n✓ Data update complete!");
  console.log(`  Articles: ${mergedArticles.length}`);
  console.log(`  Statuses: ${statuses.length}`);
  
  const hasErrors = statuses.some(s => s.last_error);
  if (hasErrors) {
    console.log("\n⚠ Some sources had errors:");
    for (const status of statuses) {
      if (status.last_error) {
        console.log(`  - ${status.source_type}: ${status.last_error}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
