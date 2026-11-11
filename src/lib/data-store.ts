/**
 * 数据存储层
 * 
 * 支持两种数据来源:
 * 1. GitHub raw URL (服务器端，带 revalidate 缓存)
 * 2. 本地 seed 数据 (fallback)
 */

import type { SourceType, Article } from "./types";
import { loadArticles, loadStatuses, REVALIDATE_SECONDS } from "./data-loader";

export interface SourceStatus {
  source_type: SourceType;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  item_count: number;
}

export interface DataStore {
  getArticles(options: {
    sourceType?: SourceType;
    category?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Article[];

  getCategories(sourceType?: SourceType): string[];
  getSourceStatuses(): SourceStatus[];
  getArticleCount(sourceType?: SourceType): number;
  getDataSource(): string;
}

function filterArticles(
  articles: Article[],
  options: {
    sourceType?: SourceType;
    category?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Article[] {
  let filtered = [...articles];

  if (options.sourceType) {
    filtered = filtered.filter((a) => a.source_type === options.sourceType);
  }

  if (options.category) {
    filtered = filtered.filter((a) => a.category === options.category);
  }

  if (options.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(searchLower) ||
        (a.summary && a.summary.toLowerCase().includes(searchLower))
    );
  }

  if (options.dateFrom) {
    const fromDate = new Date(options.dateFrom);
    filtered = filtered.filter((a) => {
      if (!a.published_at) return false;
      const pubDate = new Date(a.published_at);
      return !isNaN(pubDate.getTime()) && pubDate >= fromDate;
    });
  }

  if (options.dateTo) {
    const toDate = new Date(options.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter((a) => {
      if (!a.published_at) return false;
      const pubDate = new Date(a.published_at);
      return !isNaN(pubDate.getTime()) && pubDate <= toDate;
    });
  }

  return filtered;
}

export class DynamicDataStore implements DataStore {
  private articles: Article[] = [];
  private statuses: SourceStatus[] = [];
  private dataSource: string = "unknown";
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    const [articlesResult, statusesResult] = await Promise.all([
      loadArticles(),
      loadStatuses(),
    ]);

    this.articles = articlesResult.data;
    this.statuses = statusesResult.data as SourceStatus[];

    if (articlesResult.source === "github" && statusesResult.source === "github") {
      this.dataSource = `GitHub (revalidate: ${REVALIDATE_SECONDS}s)`;
    } else if (articlesResult.source === "seed" && statusesResult.source === "seed") {
      this.dataSource = "本地种子数据";
      if (articlesResult.error) {
        this.dataSource += ` (${articlesResult.error})`;
      }
    } else {
      this.dataSource = "混合数据源";
    }

    this.initialized = true;
  }

  getArticles(options: {
    sourceType?: SourceType;
    category?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Article[] {
    const filtered = filterArticles(this.articles, options);

    filtered.sort((a, b) => {
      const dateA = a.published_at ? new Date(a.published_at).getTime() : 0;
      const dateB = b.published_at ? new Date(b.published_at).getTime() : 0;
      if (dateA === 0 && dateB === 0) return 0;
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;
      return dateB - dateA;
    });

    const limit = options.limit || 50;
    const offset = options.offset || 0;

    return filtered.slice(offset, offset + limit);
  }

  getCategories(sourceType?: SourceType): string[] {
    const articles = sourceType
      ? this.articles.filter((a) => a.source_type === sourceType)
      : this.articles;

    const categories = new Set<string>();
    for (const article of articles) {
      if (article.category) {
        categories.add(article.category);
      }
    }

    return Array.from(categories).sort();
  }

  getSourceStatuses(): SourceStatus[] {
    return this.statuses;
  }

  getArticleCount(sourceType?: SourceType): number {
    if (sourceType) {
      return this.articles.filter((a) => a.source_type === sourceType).length;
    }
    return this.articles.length;
  }

  getDataSource(): string {
    return this.dataSource;
  }
}

let dataStoreInstance: DynamicDataStore | null = null;

export async function getDataStore(): Promise<DataStore> {
  if (!dataStoreInstance) {
    dataStoreInstance = new DynamicDataStore();
  }
  await dataStoreInstance.initialize();
  return dataStoreInstance;
}

export async function refreshDataStore(): Promise<DataStore> {
  dataStoreInstance = new DynamicDataStore();
  await dataStoreInstance.initialize();
  return dataStoreInstance;
}
