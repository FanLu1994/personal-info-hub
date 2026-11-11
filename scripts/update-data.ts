#!/usr/bin/env npx tsx
/**
 * 数据更新脚本
 * 
 * 从各数据源抓取最新内容，增量更新到data/seed/目录
 * 
 * 运行方式: npx tsx scripts/update-data.ts
 * 
 * 安全特性:
 * - 仅访问白名单域名（RSS_FEEDS配置）
 * - HTML内容清洗
 * - 超时和并发限制
 * - 原子写入（写入临时文件后rename）
 * - 损坏数据不覆盖已有数据
 * - 部分失败保留最后成功数据
 * 
 * 自动更新架构:
 * - GitHub Actions 定时运行此脚本，提交更新到 main 分支
 * - Vercel 服务器端从 GitHub raw URL 读取数据，带 revalidate 缓存
 * - 无需 Deploy Hook 或任何 secret
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// 导入完整的 RSS 配置
import { RSS_FEEDS } from "../src/lib/rss-feeds";

const DATA_DIR = path.join(process.cwd(), "data", "seed");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const STATUSES_FILE = path.join(DATA_DIR, "statuses.json");

const MAX_TOTAL_ARTICLES = 5000;
const RSS_FETCH_TIMEOUT = 12000;
const RSS_MAX_CONCURRENT = 8;
const RSS_MAX_ITEMS_PER_FEED = 15;

type SourceType = "rss" | "linuxdo" | "hackernews" | "github";

interface RssFeed {
  url: string;
  category: string;
  name?: string;
}

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
  feedsSuccess?: number;
  feedsFailed?: number;
  failedFeeds?: string[];
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

async function safeFetch(url: string, timeout: number, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; InfoDigest/2.0; +https://github.com/FanLu1994/personal-info-hub)",
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseRssItem(itemXml: string, feedName: string, category: string): Article | null {
  const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
  const linkMatch = itemXml.match(/<link>([^<]+)<\/link>/i) || 
                    itemXml.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i);
  const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i) ||
                    itemXml.match(/<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/i) ||
                    itemXml.match(/<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/i);
  const pubDateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/i) ||
                       itemXml.match(/<published>([^<]+)<\/published>/i) ||
                       itemXml.match(/<updated>([^<]+)<\/updated>/i);
  const authorMatch = itemXml.match(/<author>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/author>/i) ||
                      itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([^<]*?)(?:\]\]>)?<\/dc:creator>/i) ||
                      itemXml.match(/<name>([^<]+)<\/name>/i);
  
  if (!titleMatch || !linkMatch) return null;
  
  const title = sanitizeHtml(titleMatch[1]).trim();
  const url = linkMatch[1].trim();
  
  if (!title || !url || !url.startsWith("http")) return null;
  
  const summary = descMatch ? sanitizeHtml(descMatch[1]).slice(0, 500) : null;
  let pubDate: string | null = null;
  
  if (pubDateMatch) {
    try {
      const parsed = new Date(pubDateMatch[1].trim());
      if (!isNaN(parsed.getTime())) {
        pubDate = parsed.toISOString();
      }
    } catch {
      // ignore
    }
  }
  
  const author = authorMatch ? sanitizeHtml(authorMatch[1]).trim() : null;
  
  return {
    id: generateId("rss", url),
    source_type: "rss",
    source_name: feedName,
    category,
    title,
    summary,
    content: null,
    url,
    author,
    published_at: pubDate,
    fetched_at: new Date().toISOString(),
    is_raw_headline: true,
  };
}

async function fetchSingleRssFeed(feed: RssFeed): Promise<{ articles: Article[]; error?: string }> {
  try {
    const response = await safeFetch(feed.url, RSS_FETCH_TIMEOUT, {
      headers: {
        Accept: "application/rss+xml, application/xml, application/atom+xml, text/xml, */*",
      },
    });
    
    if (!response.ok) {
      return { articles: [], error: `HTTP ${response.status}` };
    }
    
    const xml = await response.text();
    const articles: Article[] = [];
    const feedName = feed.name || new URL(feed.url).hostname;
    
    // 尝试解析RSS 2.0格式
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    
    while ((match = itemRegex.exec(xml)) !== null && articles.length < RSS_MAX_ITEMS_PER_FEED) {
      const article = parseRssItem(match[1], feedName, feed.category);
      if (article) articles.push(article);
    }
    
    // 如果没找到item，尝试Atom格式的entry
    if (articles.length === 0) {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      while ((match = entryRegex.exec(xml)) !== null && articles.length < RSS_MAX_ITEMS_PER_FEED) {
        const article = parseRssItem(match[1], feedName, feed.category);
        if (article) articles.push(article);
      }
    }
    
    return { articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    if (error.includes("aborted")) {
      return { articles: [], error: "timeout" };
    }
    return { articles: [], error };
  }
}

async function fetchRssFeeds(): Promise<FetchResult> {
  console.log(`\n=== 抓取RSS数据 ===`);
  console.log(`配置了 ${RSS_FEEDS.length} 个RSS源`);
  
  const allArticles: Article[] = [];
  const failedFeeds: string[] = [];
  let feedsSuccess = 0;
  let feedsFailed = 0;
  
  // 分批并发处理
  for (let i = 0; i < RSS_FEEDS.length; i += RSS_MAX_CONCURRENT) {
    const batch = RSS_FEEDS.slice(i, i + RSS_MAX_CONCURRENT);
    const batchNum = Math.floor(i / RSS_MAX_CONCURRENT) + 1;
    const totalBatches = Math.ceil(RSS_FEEDS.length / RSS_MAX_CONCURRENT);
    
    process.stdout.write(`  批次 ${batchNum}/${totalBatches}...`);
    
    const results = await Promise.all(
      batch.map(async (feed) => {
        const result = await fetchSingleRssFeed(feed);
        return { feed, result };
      })
    );
    
    let batchSuccess = 0;
    for (const { feed, result } of results) {
      if (result.error) {
        feedsFailed++;
        failedFeeds.push(`${feed.name || feed.url}: ${result.error}`);
      } else {
        feedsSuccess++;
        batchSuccess++;
        allArticles.push(...result.articles);
      }
    }
    
    console.log(` ${batchSuccess}/${batch.length} OK`);
    
    // 批次间短暂延迟
    if (i + RSS_MAX_CONCURRENT < RSS_FEEDS.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log(`\nRSS汇总: ${feedsSuccess}/${RSS_FEEDS.length} 源成功, ${allArticles.length} 篇文章`);
  
  if (feedsFailed > 0) {
    console.log(`\n失败的源 (${feedsFailed}个):`);
    for (const failed of failedFeeds.slice(0, 20)) {
      console.log(`  - ${failed}`);
    }
    if (failedFeeds.length > 20) {
      console.log(`  ... 还有 ${failedFeeds.length - 20} 个`);
    }
  }
  
  return {
    success: feedsSuccess > 0,
    articles: allArticles,
    error: feedsFailed > 0 ? `${feedsFailed}/${RSS_FEEDS.length} feeds failed` : undefined,
    feedsSuccess,
    feedsFailed,
    failedFeeds,
  };
}

async function fetchHackerNews(): Promise<FetchResult> {
  const articles: Article[] = [];
  
  try {
    console.log("\n=== 抓取Hacker News ===");
    const response = await safeFetch("https://hacker-news.firebaseio.com/v0/topstories.json", 30000);
    
    if (!response.ok) {
      return { success: false, articles: [], error: `HTTP ${response.status}` };
    }
    
    const topIds: number[] = await response.json();
    const top30Ids = topIds.slice(0, 30);
    
    const items = await Promise.all(
      top30Ids.map(async (id) => {
        try {
          const itemResponse = await safeFetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, 10000);
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
    
    console.log(`HN: ${articles.length} 条`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`HN错误: ${error}`);
    return { success: false, articles: [], error };
  }
}

async function fetchGitHubTrending(): Promise<FetchResult> {
  const articles: Article[] = [];
  
  try {
    console.log("\n=== 抓取GitHub Trending ===");
    const response = await safeFetch("https://github.com/trending?since=daily", 30000, {
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
      
      articles.push({
        id: generateId("github", `${fullName}:${today}`),
        source_type: "github",
        source_name: "GitHub Trending",
        category: "今日热门",
        title: fullName,
        summary: description.slice(0, 500) || null,
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
    
    console.log(`GitHub: ${articles.length} 个仓库`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`GitHub错误: ${error}`);
    return { success: false, articles: [], error };
  }
}

async function fetchLinuxdo(): Promise<FetchResult> {
  try {
    console.log("\n=== 抓取Linux.do ===");
    const response = await safeFetch("https://linux.do/top.rss?period=daily", 15000, {
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
      const article = parseRssItem(match[1], "Linux.do", "热门讨论");
      if (article) {
        article.source_type = "linuxdo";
        articles.push(article);
      }
    }
    
    console.log(`Linux.do: ${articles.length} 条`);
    return { success: true, articles };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`Linux.do错误: ${error}`);
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
      console.log(`已加载 ${articles.length} 条现有文章`);
    }
  } catch (err) {
    console.error("加载现有文章失败:", err);
  }
  
  try {
    if (fs.existsSync(STATUSES_FILE)) {
      const data = fs.readFileSync(STATUSES_FILE, "utf-8");
      statuses = JSON.parse(data);
    }
  } catch (err) {
    console.error("加载状态失败:", err);
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
  
  // 保留已有文章
  for (const article of existing) {
    articleMap.set(article.id, article);
  }
  
  // 更新或添加新文章
  for (const article of newArticles) {
    const existingArticle = articleMap.get(article.id);
    if (existingArticle) {
      // 更新但保留原始published_at
      articleMap.set(article.id, {
        ...existingArticle,
        ...article,
        published_at: existingArticle.published_at || article.published_at,
        fetched_at: article.fetched_at,
      });
    } else {
      articleMap.set(article.id, article);
    }
  }
  
  const merged = Array.from(articleMap.values());
  
  // 排序：有日期的按日期降序，无日期的放后面
  merged.sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
    const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
    if (dateA === 0 && dateB === 0) return 0;
    if (dateA === 0) return 1;
    if (dateB === 0) return -1;
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
  console.log("=".repeat(60));
  console.log("数据更新开始于", new Date().toISOString());
  console.log("=".repeat(60));
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const { articles: existingArticles, statuses: existingStatuses } = loadExistingData();
  
  let allNewArticles: Article[] = [];
  let statuses = existingStatuses;
  
  // === RSS (完整140个源) ===
  const rssResult = await fetchRssFeeds();
  allNewArticles = allNewArticles.concat(rssResult.articles);
  statuses = updateStatus(
    statuses,
    "rss",
    rssResult.success,
    rssResult.error || null,
    rssResult.articles.length
  );
  
  // === Hacker News ===
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
  
  // === GitHub Trending ===
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
  
  // === Linux.do ===
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
  
  console.log("\n" + "=".repeat(60));
  console.log("合并摘要");
  console.log("=".repeat(60));
  console.log(`新抓取文章: ${allNewArticles.length}`);
  console.log(`现有文章: ${existingArticles.length}`);
  
  const mergedArticles = mergeArticles(existingArticles, allNewArticles);
  console.log(`合并去重后: ${mergedArticles.length}`);
  
  // 防止空数据覆盖
  if (mergedArticles.length === 0 && existingArticles.length > 0) {
    console.error("\n❌ 错误: 拒绝用空结果覆盖现有数据");
    process.exit(1);
  }
  
  console.log("\n写入数据文件...");
  atomicWrite(ARTICLES_FILE, JSON.stringify(mergedArticles, null, 2));
  atomicWrite(STATUSES_FILE, JSON.stringify(statuses, null, 2));
  
  console.log("\n" + "=".repeat(60));
  console.log("✓ 数据更新完成!");
  console.log("=".repeat(60));
  console.log(`  总文章数: ${mergedArticles.length}`);
  console.log(`  RSS: ${rssResult.feedsSuccess}/${RSS_FEEDS.length} 源, ${rssResult.articles.length} 篇`);
  console.log(`  HN: ${hnResult.articles.length} 篇`);
  console.log(`  GitHub: ${ghResult.articles.length} 个仓库`);
  console.log(`  Linux.do: ${ldResult.articles.length} 篇`);
  
  const hasErrors = statuses.some(s => s.last_error);
  if (hasErrors) {
    console.log("\n⚠ 有错误的数据源:");
    for (const status of statuses) {
      if (status.last_error) {
        console.log(`  - ${status.source_type}: ${status.last_error}`);
      }
    }
  }
  
  // 输出失败的RSS源列表（用于文档）
  if (rssResult.failedFeeds && rssResult.failedFeeds.length > 0) {
    console.log("\n📋 失败的RSS源详情:");
    for (const failed of rssResult.failedFeeds) {
      console.log(`  - ${failed}`);
    }
  }
}

main().catch((err) => {
  console.error("致命错误:", err);
  process.exit(1);
});
