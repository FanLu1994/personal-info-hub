/**
 * 数据加载器 - 服务器端从 GitHub 获取最新数据
 * 
 * 架构说明:
 * - GitHub Actions 定时提交更新的 data/seed/articles.json 到 main 分支
 * - Vercel 服务器端从 GitHub raw URL 读取数据，使用内存TTL缓存
 * - 如果 GitHub 请求失败，回退到最近成功快照或本地 seed 数据
 * - 无需 Deploy Hook，无需任何 secret
 * 
 * TTL 机制:
 * - 默认 300 秒 (5分钟) 缓存
 * - 支持注入短 TTL 用于测试
 * - 并发请求去重（同一时刻只发起一个请求）
 * - 失败时保留最近成功的内存快照
 */

import type { Article } from "./types";
import seedArticles from "../../data/seed/articles.json";
import seedStatuses from "../../data/seed/statuses.json";

const GITHUB_OWNER = "FanLu1994";
const GITHUB_REPO = "personal-info-hub";
const GITHUB_BRANCH = "main";

const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}`;

const ARTICLES_URL = `${GITHUB_RAW_BASE}/data/seed/articles.json`;
const STATUSES_URL = `${GITHUB_RAW_BASE}/data/seed/statuses.json`;

const FETCH_TIMEOUT_MS = 8000;
const DEFAULT_TTL_MS = 300_000;

let configuredTtlMs = DEFAULT_TTL_MS;

export function setTtlMs(ttlMs: number): void {
  configuredTtlMs = ttlMs;
}

export function getTtlMs(): number {
  return configuredTtlMs;
}

interface SourceStatus {
  source_type: string;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  item_count: number;
}

interface CachedData<T> {
  data: T;
  fetchedAt: number;
  source: "github" | "seed" | "cache";
}

interface DataSnapshot {
  articles: CachedData<Article[]> | null;
  statuses: CachedData<SourceStatus[]> | null;
  lastSuccessfulArticles: Article[] | null;
  lastSuccessfulStatuses: SourceStatus[] | null;
}

const snapshot: DataSnapshot = {
  articles: null,
  statuses: null,
  lastSuccessfulArticles: null,
  lastSuccessfulStatuses: null,
};

let fetchInProgress: Promise<void> | null = null;

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "InfoDigest/2.0",
      },
      cache: "no-store",
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateArticle(article: unknown, index: number): string | null {
  if (typeof article !== "object" || article === null) {
    return `Article ${index}: not an object`;
  }
  const a = article as Record<string, unknown>;
  
  if (typeof a.id !== "string" || !a.id) {
    return `Article ${index}: missing or invalid id`;
  }
  if (typeof a.title !== "string" || !a.title) {
    return `Article ${index}: missing or invalid title`;
  }
  if (typeof a.url !== "string" || !a.url.startsWith("http")) {
    return `Article ${index}: missing or invalid url`;
  }
  if (!["rss", "hackernews", "github", "linuxdo"].includes(a.source_type as string)) {
    return `Article ${index}: invalid source_type`;
  }
  return null;
}

function validateArticles(data: unknown): data is Article[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  
  for (let i = 0; i < Math.min(data.length, 100); i++) {
    const error = validateArticle(data[i], i);
    if (error) {
      console.warn(`Article validation failed: ${error}`);
      return false;
    }
  }
  return true;
}

function validateStatuses(data: unknown): data is SourceStatus[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  
  const sample = data[0];
  return (
    typeof sample === "object" &&
    sample !== null &&
    "source_type" in sample
  );
}

function isCacheValid<T>(cached: CachedData<T> | null): boolean {
  if (!cached) return false;
  const age = Date.now() - cached.fetchedAt;
  return age < configuredTtlMs;
}

async function fetchFromGitHub(): Promise<void> {
  const now = Date.now();
  
  try {
    const [articlesResponse, statusesResponse] = await Promise.all([
      fetchWithTimeout(ARTICLES_URL, FETCH_TIMEOUT_MS),
      fetchWithTimeout(STATUSES_URL, FETCH_TIMEOUT_MS),
    ]);

    if (!articlesResponse.ok || !statusesResponse.ok) {
      throw new Error(`HTTP error: articles=${articlesResponse.status}, statuses=${statusesResponse.status}`);
    }

    const [articlesData, statusesData] = await Promise.all([
      articlesResponse.json(),
      statusesResponse.json(),
    ]);

    if (!validateArticles(articlesData)) {
      throw new Error("Articles validation failed");
    }

    if (!validateStatuses(statusesData)) {
      throw new Error("Statuses validation failed");
    }

    if (articlesData.length === 0 && snapshot.lastSuccessfulArticles && snapshot.lastSuccessfulArticles.length > 0) {
      console.warn("GitHub returned empty articles, keeping last successful snapshot");
      return;
    }

    snapshot.articles = {
      data: articlesData,
      fetchedAt: now,
      source: "github",
    };
    snapshot.statuses = {
      data: statusesData,
      fetchedAt: now,
      source: "github",
    };

    snapshot.lastSuccessfulArticles = articlesData;
    snapshot.lastSuccessfulStatuses = statusesData;

    console.log(`Data refreshed from GitHub: ${articlesData.length} articles`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`GitHub fetch failed: ${errorMsg}`);

    if (snapshot.lastSuccessfulArticles && snapshot.lastSuccessfulStatuses) {
      console.log("Using last successful snapshot");
      snapshot.articles = {
        data: snapshot.lastSuccessfulArticles,
        fetchedAt: now,
        source: "cache",
      };
      snapshot.statuses = {
        data: snapshot.lastSuccessfulStatuses,
        fetchedAt: now,
        source: "cache",
      };
    } else {
      console.log("Using seed data as fallback");
      snapshot.articles = {
        data: seedArticles as Article[],
        fetchedAt: now,
        source: "seed",
      };
      snapshot.statuses = {
        data: seedStatuses as SourceStatus[],
        fetchedAt: now,
        source: "seed",
      };
    }
  }
}

async function ensureFreshData(): Promise<void> {
  if (isCacheValid(snapshot.articles) && isCacheValid(snapshot.statuses)) {
    return;
  }

  if (fetchInProgress) {
    await fetchInProgress;
    return;
  }

  fetchInProgress = fetchFromGitHub();
  try {
    await fetchInProgress;
  } finally {
    fetchInProgress = null;
  }
}

export async function loadArticles(): Promise<{ data: Article[]; source: string }> {
  await ensureFreshData();
  
  if (snapshot.articles) {
    return {
      data: snapshot.articles.data,
      source: snapshot.articles.source,
    };
  }

  return {
    data: seedArticles as Article[],
    source: "seed",
  };
}

export async function loadStatuses(): Promise<{ data: SourceStatus[]; source: string }> {
  await ensureFreshData();
  
  if (snapshot.statuses) {
    return {
      data: snapshot.statuses.data,
      source: snapshot.statuses.source,
    };
  }

  return {
    data: seedStatuses as SourceStatus[],
    source: "seed",
  };
}

export function getCacheAge(): number {
  if (!snapshot.articles) return -1;
  return Date.now() - snapshot.articles.fetchedAt;
}

export function invalidateCache(): void {
  snapshot.articles = null;
  snapshot.statuses = null;
}

export { DEFAULT_TTL_MS, GITHUB_RAW_BASE };
