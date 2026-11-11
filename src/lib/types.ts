export type SourceType = "rss" | "linuxdo" | "hackernews" | "github";

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
  error?: string;
}

export const SOURCE_LABELS: Record<SourceType, string> = {
  rss: "RSS 订阅",
  linuxdo: "Linux.do",
  hackernews: "Hacker News",
  github: "GitHub Trending",
};

export const SOURCE_CATEGORIES: Record<SourceType, string[]> = {
  rss: ["国内模型厂商", "国外模型厂商", "海外科技媒体", "中文技术博客", "英文技术博客"],
  linuxdo: ["热门讨论"],
  hackernews: ["热门帖子"],
  github: ["今日热门"],
};
