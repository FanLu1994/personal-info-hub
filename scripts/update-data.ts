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
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data", "seed");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const STATUSES_FILE = path.join(DATA_DIR, "statuses.json");

const MAX_TOTAL_ARTICLES = 3000;
const RSS_FETCH_TIMEOUT = 15000;
const RSS_MAX_CONCURRENT = 5;
const RSS_MAX_ITEMS_PER_FEED = 20;

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
        "User-Agent": "InfoDigest/2.0 (Personal Information Aggregator)",
        ...options.headers,
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============ RSS FEEDS 配置 (从 src/lib/rss-feeds.ts 同步) ============
const RSS_FEEDS: RssFeed[] = [
  // 国内模型厂商
  { url: "https://qwenlm.github.io/blog/index.xml", category: "国内模型厂商", name: "通义千问" },
  { url: "https://wechat2rss.bestblogs.dev/feed/1709da4f538d4ce4fb6d7a8ba1a5a1c297919601.xml", category: "国内模型厂商", name: "DeepSeek" },
  { url: "https://wechat2rss.bestblogs.dev/feed/433d2134dca54d80804daf32e8be546155be3300.xml", category: "国内模型厂商", name: "智谱" },
  { url: "https://wechat2rss.bestblogs.dev/feed/c5c43d4bc17bae656763859ed0903bb6314ec6fe.xml", category: "国内模型厂商", name: "Kimi" },
  
  // 国外模型厂商
  { url: "https://openai.com/news/rss.xml", category: "国外模型厂商", name: "OpenAI" },
  { url: "https://huggingface.co/blog/feed.xml", category: "国外模型厂商", name: "Hugging Face" },
  { url: "https://mistral.ai/news/rss", category: "国外模型厂商", name: "Mistral" },
  { url: "https://ollama.com/blog/rss.xml", category: "国外模型厂商", name: "Ollama" },
  { url: "https://rsshub.bestblogs.dev/anthropic/news", category: "国外模型厂商", name: "Anthropic" },
  
  // 海外科技媒体
  { url: "https://feeds.arstechnica.com/arstechnica/index", category: "海外科技媒体", name: "Ars Technica" },
  { url: "https://www.theverge.com/rss/index.xml", category: "海外科技媒体", name: "The Verge" },
  { url: "https://www.wired.com/feed/rss", category: "海外科技媒体", name: "WIRED" },
  { url: "https://techcrunch.com/feed/", category: "海外科技媒体", name: "TechCrunch" },
  { url: "https://www.404media.co/rss/", category: "海外科技媒体", name: "404 Media" },
  { url: "https://www.techmeme.com/feed.xml", category: "海外科技媒体", name: "Techmeme" },
  
  // 中文技术博客 - 精选稳定源
  { url: "https://blog.codingnow.com/atom.xml", category: "中文技术博客", name: "云风" },
  { url: "https://coolshell.cn/feed", category: "中文技术博客", name: "酷壳" },
  { url: "https://tech.meituan.com/feed/", category: "中文技术博客", name: "美团技术" },
  { url: "https://tonybai.com/feed/", category: "中文技术博客", name: "Tony Bai" },
  { url: "https://tw93.fun/feed.xml", category: "中文技术博客", name: "Tw93" },
  { url: "https://weekly.tw93.fun/rss.xml", category: "中文技术博客", name: "潮流周刊" },
  { url: "https://www.zhangxinxu.com/wordpress/feed/", category: "中文技术博客", name: "张鑫旭" },
  { url: "https://diygod.cc/feed", category: "中文技术博客", name: "DIYgod" },
  { url: "https://www.ruanyifeng.com/blog/atom.xml", category: "中文技术博客", name: "阮一峰" },
  { url: "https://onevcat.com/feed.xml", category: "中文技术博客", name: "OneV's Den" },
  { url: "https://wiki.eryajf.net/rss.xml", category: "中文技术博客", name: "二丫讲梵" },
  { url: "https://www.pseudoyu.com/feed.xml", category: "中文技术博客", name: "pseudoyu" },
  { url: "https://sugarat.top/weekly.rss", category: "中文技术博客", name: "粥里有勺糖" },
  { url: "https://aigc-weekly.agi.li/rss.xml", category: "中文技术博客", name: "AIGC周刊" },
  
  // 英文技术博客
  { url: "https://krebsonsecurity.com/feed/", category: "英文技术博客", name: "Krebs Security" },
  { url: "https://daringfireball.net/feeds/main", category: "英文技术博客", name: "Daring Fireball" },
  { url: "https://mitchellh.com/feed.xml", category: "英文技术博客", name: "Mitchell Hashimoto" },
];

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
  console.log(`Fetching RSS feeds (${RSS_FEEDS.length} sources)...`);
  
  const allArticles: Article[] = [];
  const failedFeeds: string[] = [];
  let feedsSuccess = 0;
  let feedsFailed = 0;
  
  // 分批并发处理
  for (let i = 0; i < RSS_FEEDS.length; i += RSS_MAX_CONCURRENT) {
    const batch = RSS_FEEDS.slice(i, i + RSS_MAX_CONCURRENT);
    const results = await Promise.all(
      batch.map(async (feed) => {
        const result = await fetchSingleRssFeed(feed);
        return { feed, result };
      })
    );
    
    for (const { feed, result } of results) {
      if (result.error) {
        feedsFailed++;
        failedFeeds.push(`${feed.name || feed.url}: ${result.error}`);
      } else {
        feedsSuccess++;
        allArticles.push(...result.articles);
      }
    }
    
    // 批次间短暂延迟，避免过于激进
    if (i + RSS_MAX_CONCURRENT < RSS_FEEDS.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  console.log(`  RSS: ${feedsSuccess}/${RSS_FEEDS.length} feeds OK, ${allArticles.length} articles`);
  if (feedsFailed > 0) {
    console.log(`  Failed feeds: ${failedFeeds.slice(0, 5).join(", ")}${failedFeeds.length > 5 ? ` (+${failedFeeds.length - 5} more)` : ""}`);
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
    console.log("Fetching Hacker News...");
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
    
    console.log(`  HN: ${articles.length} items`);
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
    
    console.log(`  GitHub: ${articles.length} repos`);
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
    
    console.log(`  Linux.do: ${articles.length} items`);
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
    if (dateA === 0) return 1; // 无日期的放后面
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
  console.log("Starting data update at", new Date().toISOString());
  console.log("=".repeat(60));
  console.log("");
  
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  const { articles: existingArticles, statuses: existingStatuses } = loadExistingData();
  
  let allNewArticles: Article[] = [];
  let statuses = existingStatuses;
  
  // === RSS ===
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
  
  console.log("");
  console.log("=".repeat(60));
  console.log("Merge Summary");
  console.log("=".repeat(60));
  console.log(`New articles fetched: ${allNewArticles.length}`);
  console.log(`Existing articles: ${existingArticles.length}`);
  
  const mergedArticles = mergeArticles(existingArticles, allNewArticles);
  console.log(`After merge & dedup: ${mergedArticles.length}`);
  
  // 防止空数据覆盖
  if (mergedArticles.length === 0 && existingArticles.length > 0) {
    console.error("\n❌ ERROR: Refusing to overwrite existing data with empty result");
    process.exit(1);
  }
  
  console.log("\nWriting data files...");
  atomicWrite(ARTICLES_FILE, JSON.stringify(mergedArticles, null, 2));
  atomicWrite(STATUSES_FILE, JSON.stringify(statuses, null, 2));
  
  console.log("");
  console.log("=".repeat(60));
  console.log("✓ Data update complete!");
  console.log("=".repeat(60));
  console.log(`  Total articles: ${mergedArticles.length}`);
  console.log(`  RSS: ${rssResult.feedsSuccess}/${RSS_FEEDS.length} feeds, ${rssResult.articles.length} articles`);
  console.log(`  HN: ${hnResult.articles.length} articles`);
  console.log(`  GitHub: ${ghResult.articles.length} repos`);
  console.log(`  Linux.do: ${ldResult.articles.length} articles`);
  
  const hasErrors = statuses.some(s => s.last_error);
  if (hasErrors) {
    console.log("\n⚠ Sources with errors:");
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
