"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { SourceTabs } from "./SourceTabs";
import { StatusBar } from "./StatusBar";
import { SearchFilters } from "./SearchFilters";
import { ArticleList } from "./ArticleList";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePreferences } from "@/hooks/usePreferences";
import type { SourceType, Article } from "@/lib/types";
import { Newspaper, Info } from "lucide-react";

interface SourceStatus {
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  itemCount: number;
}

interface StatusData {
  statuses: Record<SourceType, SourceStatus>;
  counts: Record<SourceType, number>;
  totalCount: number;
  dataSource?: string;
}

interface ArticlesData {
  articles: Article[];
  total: number;
  categories: string[];
  hasMore: boolean;
}

const DEFAULT_STATUS: SourceStatus = {
  lastSuccessAt: null,
  lastAttemptAt: null,
  lastError: null,
  itemCount: 0,
};

export function InfoDigest() {
  const [activeSource, setActiveSource] = useState<SourceType | "all" | "bookmarks">("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statuses, setStatuses] = useState<Record<SourceType, SourceStatus>>({
    rss: DEFAULT_STATUS,
    linuxdo: DEFAULT_STATUS,
    hackernews: DEFAULT_STATUS,
    github: DEFAULT_STATUS,
  });
  const [counts, setCounts] = useState<Record<SourceType | "all", number>>({
    all: 0,
    rss: 0,
    linuxdo: 0,
    hackernews: 0,
    github: 0,
  });
  const [dataSource, setDataSource] = useState<string | undefined>();

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const offsetRef = useRef(0);

  const { bookmarks, toggleBookmark, isBookmarked, bookmarkCount } = useBookmarks();
  const { markAsRead, isRead } = usePreferences();

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      const data: StatusData = await res.json();
      setStatuses(data.statuses);
      setCounts({
        ...data.counts,
        all: data.totalCount,
      });
      setDataSource(data.dataSource);
    } catch (error) {
      console.error("Failed to fetch status:", error);
    }
  }, []);

  const fetchArticles = useCallback(
    async (reset = false) => {
      if (activeSource === "bookmarks") {
        return;
      }

      setIsLoading(true);
      const currentOffset = reset ? 0 : offsetRef.current;

      try {
        const params = new URLSearchParams();
        if (activeSource !== "all") {
          params.set("source", activeSource);
        }
        if (search) params.set("search", search);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);
        if (selectedCategory) params.set("category", selectedCategory);
        params.set("limit", "50");
        params.set("offset", String(currentOffset));

        const res = await fetch(`/api/articles?${params}`);
        const data: ArticlesData = await res.json();

        if (reset) {
          setArticles(data.articles);
          offsetRef.current = data.articles.length;
        } else {
          setArticles((prev) => [...prev, ...data.articles]);
          offsetRef.current = currentOffset + data.articles.length;
        }

        setCategories(data.categories);
        setHasMore(data.hasMore);
      } catch (error) {
        console.error("Failed to fetch articles:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [activeSource, search, dateFrom, dateTo, selectedCategory]
  );

  const bookmarkedArticles = useMemo(() => {
    if (activeSource !== "bookmarks") return [];
    return articles.filter((a) => bookmarks.has(a.id));
  }, [activeSource, articles, bookmarks]);

  const handleSourceChange = (source: SourceType | "all" | "bookmarks") => {
    setActiveSource(source);
    offsetRef.current = 0;
    setSelectedCategory("");
  };

  const handleClearFilters = () => {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setSelectedCategory("");
    offsetRef.current = 0;
  };

  const handleLoadMore = () => {
    fetchArticles(false);
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    offsetRef.current = 0;
    if (activeSource !== "bookmarks") {
      fetchArticles(true);
    }
  }, [activeSource, search, dateFrom, dateTo, selectedCategory, fetchArticles]);

  useEffect(() => {
    if (activeSource === "bookmarks" && bookmarks.size > 0) {
      const fetchAllForBookmarks = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/articles?limit=1000`);
          const data: ArticlesData = await res.json();
          setArticles(data.articles);
          setCategories(data.categories);
        } catch (error) {
          console.error("Failed to fetch for bookmarks:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchAllForBookmarks();
    }
  }, [activeSource, bookmarks.size]);

  const displayedArticles =
    activeSource === "bookmarks" ? bookmarkedArticles : articles;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-50 bg-white border-b border-neutral-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-neutral-900 rounded-lg">
                <Newspaper className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">信息聚合</h1>
                <p className="text-xs text-neutral-500">个人信息流阅读器</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                <Info className="h-3 w-3" />
                <span>原始抓取，非AI摘要</span>
              </div>
            </div>
          </div>
        </div>

        <SourceTabs
          activeSource={activeSource}
          onSourceChange={handleSourceChange}
          counts={counts}
          bookmarkCount={bookmarkCount}
        />
      </header>

      <main className="max-w-5xl mx-auto bg-white min-h-screen shadow-sm">
        <StatusBar statuses={statuses} dataSource={dataSource} />

        <SearchFilters
          search={search}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedCategory={selectedCategory}
          categories={categories}
          onSearchChange={setSearch}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          onCategoryChange={setSelectedCategory}
          onClear={handleClearFilters}
        />

        <ArticleList
          articles={displayedArticles}
          isLoading={isLoading}
          hasMore={activeSource !== "bookmarks" && hasMore}
          isBookmarked={isBookmarked}
          isRead={isRead}
          onToggleBookmark={toggleBookmark}
          onMarkAsRead={markAsRead}
          onLoadMore={handleLoadMore}
          showSource={activeSource === "all" || activeSource === "bookmarks"}
        />
      </main>

      <footer className="max-w-5xl mx-auto py-8 px-4 text-center text-xs text-neutral-400">
        <p>
          数据来源：用户配置的 RSS 订阅、Linux.do、Hacker News、GitHub Trending
        </p>
        <p className="mt-1">
          <strong>原始抓取标题</strong>：当前显示的是从公开 Feed/API 直接获取的原始标题和摘要，
          <strong>非 AI 生成摘要</strong>。未来经过用户验证的精选摘要将单独标记。
        </p>
        <p className="mt-2 text-neutral-300">
          本地书签和阅读状态保存在浏览器中。数据在部署时预生成。
        </p>
      </footer>
    </div>
  );
}
