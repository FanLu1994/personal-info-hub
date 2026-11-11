export type SourceType = "rss" | "linuxdo" | "hackernews" | "github";

export type ContentQuality = "raw" | "verified" | "curated";

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
  is_raw_headline: boolean;
  
  content_quality?: ContentQuality;
  verified_summary?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  
  raw_data?: string | null;
}

export interface GitHubRepoMeta {
  fullName: string;
  description: string;
  language: string | null;
  stars: number;
  starsToday: number;
  forks: number;
  topics?: string[];
}

export interface HNItemMeta {
  hn_id: number;
  hn_url: string;
  original_url?: string;
  score: number;
  comments: number;
}

export interface SourceStatus {
  source_type: SourceType;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
  item_count: number;
}

export interface FetchResult {
  success: boolean;
  itemsAdded: number;
  itemsUpdated?: number;
  error?: string;
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  rss: "RSS 订阅",
  linuxdo: "Linux.do",
  hackernews: "Hacker News",
  github: "GitHub Trending",
};

export const SOURCE_ICONS: Record<SourceType, string> = {
  rss: "rss",
  linuxdo: "message-circle",
  hackernews: "flame",
  github: "github",
};

export const SOURCE_CATEGORIES: Record<SourceType, string[]> = {
  rss: ["国内模型厂商", "国外模型厂商", "海外科技媒体", "中文技术博客", "英文技术博客"],
  linuxdo: ["热门讨论"],
  hackernews: ["热门帖子"],
  github: ["今日热门"],
};

export const QUALITY_LABELS: Record<ContentQuality, string> = {
  raw: "原始抓取",
  verified: "已验证",
  curated: "精选",
};

export type ViewType = SourceType | "all" | "bookmarks";

export interface FilterState {
  source: SourceType | "all";
  category: string;
  search: string;
  dateFrom: string;
  dateTo: string;
  readState: "all" | "unread" | "read";
  sortBy: "date" | "source";
  sortOrder: "desc" | "asc";
}

export const DEFAULT_FILTER_STATE: FilterState = {
  source: "all",
  category: "",
  search: "",
  dateFrom: "",
  dateTo: "",
  readState: "all",
  sortBy: "date",
  sortOrder: "desc",
};

export interface VerifiedContent {
  article_id: string;
  summary_zh: string;
  key_points?: string[];
  verified_at: string;
  verified_by: string;
}

export interface VerifiedContentIndex {
  version: string;
  updated_at: string;
  items: VerifiedContent[];
}
