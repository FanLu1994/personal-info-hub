import type { SourceType } from "./types";

export interface Article {
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
  raw_data: string | null;
  is_raw_headline: boolean;
}

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
}

let seedArticles: Article[] | null = null;
let seedStatuses: SourceStatus[] | null = null;

async function loadSeedData(): Promise<void> {
  if (seedArticles !== null) return;

  try {
    const articlesModule = await import("../../data/seed/articles.json");
    const statusesModule = await import("../../data/seed/statuses.json");

    seedArticles = articlesModule.default as Article[];
    seedStatuses = statusesModule.default as SourceStatus[];
  } catch {
    console.warn("No seed data found, starting with empty data");
    seedArticles = [];
    seedStatuses = [];
  }
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

export class StaticDataStore implements DataStore {
  private articles: Article[] = [];
  private statuses: SourceStatus[] = [];
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await loadSeedData();
    this.articles = seedArticles || [];
    this.statuses = seedStatuses || [];
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
}

let dataStoreInstance: StaticDataStore | null = null;

export async function getDataStore(): Promise<DataStore> {
  if (!dataStoreInstance) {
    dataStoreInstance = new StaticDataStore();
    await dataStoreInstance.initialize();
  }
  return dataStoreInstance;
}
