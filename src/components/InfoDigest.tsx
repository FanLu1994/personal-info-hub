"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Sidebar, MobileHeader } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { ArticleList } from "./ArticleList";
import { ReadingPanel, MobileReadingPanel, OverlayReadingPanel } from "./ReadingPanel";
import { StatusIndicator } from "./StatusIndicator";
import { useBookmarks } from "@/hooks/useBookmarks";
import { usePreferences } from "@/hooks/usePreferences";
import { useFilters } from "@/hooks/useFilters";
import { useTheme } from "@/hooks/useTheme";
import type { SourceType, Article, ViewType } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewType>("all");
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
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
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const offsetRef = useRef(0);

  const { bookmarks, toggleBookmark, isBookmarked, bookmarkCount } = useBookmarks();
  const { markAsRead, markAllAsRead, isRead, prefs, setPrefs } = usePreferences();
  const { filters, setFilters, resetFilters, getShareableUrl, hasActiveFilters, isInitialized } = useFilters();
  const { effectiveTheme, toggleTheme, mounted } = useTheme();

  const isBookmarksView = viewMode === "bookmarks";
  const activeSource = isBookmarksView ? "all" : viewMode;

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
      
      const latestSuccess = Object.values(data.statuses)
        .map(s => s.lastSuccessAt)
        .filter(Boolean)
        .sort()
        .pop();
      setLastUpdated(latestSuccess || null);
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  }, []);

  const fetchArticles = useCallback(
    async (reset = false) => {
      if (isBookmarksView) {
        return;
      }

      if (reset) {
        setIsLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }
      
      const currentOffset = reset ? 0 : offsetRef.current;

      try {
        const params = new URLSearchParams();
        if (activeSource !== "all") {
          params.set("source", activeSource);
        }
        if (filters.search) params.set("search", filters.search);
        if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
        if (filters.dateTo) params.set("dateTo", filters.dateTo);
        if (filters.category) params.set("category", filters.category);
        params.set("limit", "50");
        params.set("offset", String(currentOffset));

        const res = await fetch(`/api/articles?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
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
      } catch (err) {
        console.error("Failed to fetch articles:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [isBookmarksView, activeSource, filters.search, filters.dateFrom, filters.dateTo, filters.category]
  );

  const displayedArticles = useMemo(() => {
    let result = articles;

    if (isBookmarksView) {
      result = articles.filter((a) => bookmarks.has(a.id));
    }

    if (filters.readState === "unread") {
      result = result.filter((a) => !isRead(a.id));
    } else if (filters.readState === "read") {
      result = result.filter((a) => isRead(a.id));
    }

    if (filters.sortBy === "source") {
      result = [...result].sort((a, b) => a.source_type.localeCompare(b.source_type));
    }
    
    if (filters.sortOrder === "asc") {
      result = [...result].reverse();
    }

    return result;
  }, [articles, isBookmarksView, bookmarks, filters.readState, filters.sortBy, filters.sortOrder, isRead]);

  const unreadCount = useMemo(() => {
    return articles.filter(a => !isRead(a.id)).length;
  }, [articles, isRead]);

  const handleSourceChange = (source: ViewType) => {
    setViewMode(source);
    if (source !== "bookmarks") {
      setFilters({ source: source as SourceType | "all", category: "" });
    }
    offsetRef.current = 0;
    setSelectedArticle(null);
    
    if (source === "bookmarks") {
      fetchAllForBookmarks();
    }
  };

  const fetchAllForBookmarks = async () => {
    if (bookmarks.size === 0) {
      setArticles([]);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/articles?limit=2000`);
      const data: ArticlesData = await res.json();
      setArticles(data.articles);
      setCategories(data.categories);
      setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch for bookmarks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = () => {
    const ids = displayedArticles.map(a => a.id);
    markAllAsRead(ids);
  };

  const handleShare = async () => {
    const url = getShareableUrl();
    try {
      await navigator.clipboard.writeText(url);
      alert("链接已复制到剪贴板");
    } catch {
      prompt("复制以下链接分享当前筛选:", url);
    }
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
    markAsRead(article.id);
  };

  const handleOpenExternal = () => {
    if (selectedArticle) {
      markAsRead(selectedArticle.id);
      window.open(selectedArticle.url, "_blank", "noopener,noreferrer");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (!isInitialized) return;
    
    offsetRef.current = 0;
    if (!isBookmarksView) {
      fetchArticles(true);
    }
  }, [isInitialized, isBookmarksView, activeSource, filters.search, filters.dateFrom, filters.dateTo, filters.category, fetchArticles]);

  useEffect(() => {
    if (isBookmarksView && bookmarks.size > 0 && isInitialized) {
      fetchAllForBookmarks();
    }
  }, [isBookmarksView, isInitialized, bookmarks.size]);

  if (!mounted) {
    return null;
  }

  const currentTitle = isBookmarksView 
    ? "收藏" 
    : activeSource === "all" 
      ? "全部文章" 
      : SOURCE_LABELS[activeSource as SourceType];

  return (
    <div className="flex min-h-screen bg-[var(--color-bg-secondary)]">
      {/* Sidebar */}
      <Sidebar
        activeSource={viewMode}
        onSourceChange={handleSourceChange}
        counts={counts}
        bookmarkCount={bookmarkCount}
        unreadCount={unreadCount}
        theme={effectiveTheme}
        onToggleTheme={toggleTheme}
        lastUpdated={lastUpdated}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <MobileHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={currentTitle}
        />

        <div className="flex-1 flex">
          {/* Article list */}
          <div className="flex-1 min-w-0 bg-[var(--color-bg-primary)] flex flex-col">
            <Toolbar
              filters={filters}
              onFiltersChange={setFilters}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
              categories={categories}
              onMarkAllRead={handleMarkAllRead}
              onMarkAllUnread={() => {}}
              onShare={handleShare}
              articleCount={displayedArticles.length}
              compactMode={prefs.compactMode}
              onToggleCompact={() => setPrefs({ compactMode: !prefs.compactMode })}
            />

            <StatusIndicator statuses={statuses} dataSource={dataSource} />

            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <ArticleList
                articles={displayedArticles}
                isLoading={isLoading}
                isLoadingMore={isLoadingMore}
                hasMore={!isBookmarksView && hasMore}
                selectedArticleId={selectedArticle?.id || null}
                compactMode={prefs.compactMode}
                showSource={activeSource === "all" || isBookmarksView}
                isBookmarked={isBookmarked}
                isRead={isRead}
                onSelectArticle={handleSelectArticle}
                onToggleBookmark={toggleBookmark}
                onMarkAsRead={markAsRead}
                onLoadMore={() => fetchArticles(false)}
                error={error}
              />
            </div>
          </div>

          {/* Reading panel - large desktop only (xl+) */}
          <ReadingPanel
            article={selectedArticle}
            isBookmarked={selectedArticle ? isBookmarked(selectedArticle.id) : false}
            isRead={selectedArticle ? isRead(selectedArticle.id) : false}
            onClose={() => setSelectedArticle(null)}
            onToggleBookmark={() => selectedArticle && toggleBookmark(selectedArticle.id)}
            onMarkAsRead={() => selectedArticle && markAsRead(selectedArticle.id)}
            onOpenExternal={handleOpenExternal}
          />
        </div>
      </main>

      {/* Reading panel - medium desktop overlay (md to xl) */}
      <OverlayReadingPanel
        article={selectedArticle}
        isBookmarked={selectedArticle ? isBookmarked(selectedArticle.id) : false}
        isRead={selectedArticle ? isRead(selectedArticle.id) : false}
        onClose={() => setSelectedArticle(null)}
        onToggleBookmark={() => selectedArticle && toggleBookmark(selectedArticle.id)}
        onMarkAsRead={() => selectedArticle && markAsRead(selectedArticle.id)}
        onOpenExternal={handleOpenExternal}
      />

      {/* Reading panel - mobile (below md) */}
      <MobileReadingPanel
        article={selectedArticle}
        isBookmarked={selectedArticle ? isBookmarked(selectedArticle.id) : false}
        isRead={selectedArticle ? isRead(selectedArticle.id) : false}
        onClose={() => setSelectedArticle(null)}
        onToggleBookmark={() => selectedArticle && toggleBookmark(selectedArticle.id)}
        onMarkAsRead={() => selectedArticle && markAsRead(selectedArticle.id)}
        onOpenExternal={handleOpenExternal}
      />

      {/* Footer note - only visible on mobile when no article selected */}
      {!selectedArticle && (
        <footer className="md:hidden fixed bottom-0 left-0 right-0 p-3 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)] text-center">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            书签和已读状态保存在此设备浏览器中
          </p>
        </footer>
      )}
    </div>
  );
}
