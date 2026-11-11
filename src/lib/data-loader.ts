/**
 * 数据加载器 - 服务器端从 GitHub 获取最新数据
 * 
 * 架构说明:
 * - GitHub Actions 定时提交更新的 data/seed/articles.json 到 main 分支
 * - Vercel 服务器端从 GitHub raw URL 读取数据，使用 revalidate 缓存
 * - 如果 GitHub 请求失败，回退到本地 seed 数据
 * - 无需 Deploy Hook，无需任何 secret
 * 
 * 安全特性:
 * - 仅读取固定白名单 URL (本仓库的 raw.githubusercontent.com)
 * - 不暴露任何认证信息
 * - 数据有效性验证
 * - 超时和错误处理
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
const REVALIDATE_SECONDS = 300;

interface SourceStatus {
  source_type: string;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  item_count: number;
}

interface DataLoadResult<T> {
  data: T;
  source: "github" | "seed";
  error?: string;
  stale?: boolean;
}

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
      next: {
        revalidate: REVALIDATE_SECONDS,
      },
    } as RequestInit);
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function validateArticles(data: unknown): data is Article[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  
  const sample = data[0];
  return (
    typeof sample === "object" &&
    sample !== null &&
    "id" in sample &&
    "title" in sample &&
    "url" in sample &&
    "source_type" in sample
  );
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

export async function loadArticles(): Promise<DataLoadResult<Article[]>> {
  try {
    const response = await fetchWithTimeout(ARTICLES_URL, FETCH_TIMEOUT_MS);

    if (!response.ok) {
      console.warn(`GitHub articles fetch failed: HTTP ${response.status}`);
      return {
        data: seedArticles as Article[],
        source: "seed",
        error: `GitHub HTTP ${response.status}`,
        stale: true,
      };
    }

    const data = await response.json();

    if (!validateArticles(data)) {
      console.warn("GitHub articles validation failed");
      return {
        data: seedArticles as Article[],
        source: "seed",
        error: "Validation failed",
        stale: true,
      };
    }

    return {
      data,
      source: "github",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`GitHub articles fetch error: ${errorMsg}`);
    return {
      data: seedArticles as Article[],
      source: "seed",
      error: errorMsg,
      stale: true,
    };
  }
}

export async function loadStatuses(): Promise<DataLoadResult<SourceStatus[]>> {
  try {
    const response = await fetchWithTimeout(STATUSES_URL, FETCH_TIMEOUT_MS);

    if (!response.ok) {
      console.warn(`GitHub statuses fetch failed: HTTP ${response.status}`);
      return {
        data: seedStatuses as SourceStatus[],
        source: "seed",
        error: `GitHub HTTP ${response.status}`,
        stale: true,
      };
    }

    const data = await response.json();

    if (!validateStatuses(data)) {
      console.warn("GitHub statuses validation failed");
      return {
        data: seedStatuses as SourceStatus[],
        source: "seed",
        error: "Validation failed",
        stale: true,
      };
    }

    return {
      data,
      source: "github",
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.warn(`GitHub statuses fetch error: ${errorMsg}`);
    return {
      data: seedStatuses as SourceStatus[],
      source: "seed",
      error: errorMsg,
      stale: true,
    };
  }
}

export { REVALIDATE_SECONDS, GITHUB_RAW_BASE };
