"use client";

import { useEffect, useRef, useCallback } from "react";
import { ArticleCard, CompactArticleCard } from "./ArticleCard";
import { ArticleSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/types";
import { Inbox, AlertCircle, Loader2 } from "lucide-react";

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  selectedArticleId: string | null;
  compactMode: boolean;
  showSource: boolean;
  isBookmarked: (id: string) => boolean;
  isRead: (id: string) => boolean;
  onSelectArticle: (article: Article) => void;
  onToggleBookmark: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onLoadMore: () => void;
  error?: string | null;
}

export function ArticleList({
  articles,
  isLoading,
  isLoadingMore,
  hasMore,
  selectedArticleId,
  compactMode,
  showSource,
  isBookmarked,
  isRead,
  onSelectArticle,
  onToggleBookmark,
  onMarkAsRead,
  onLoadMore,
  error,
}: ArticleListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!articles.length) return;
    
    const currentIndex = selectedArticleId 
      ? articles.findIndex(a => a.id === selectedArticleId)
      : -1;

    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, articles.length - 1);
      onSelectArticle(articles[nextIndex]);
    } else if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      onSelectArticle(articles[prevIndex]);
    } else if (e.key === "Enter" && selectedArticleId) {
      e.preventDefault();
      const article = articles.find(a => a.id === selectedArticleId);
      if (article) {
        window.open(article.url, "_blank", "noopener,noreferrer");
      }
    } else if (e.key === "b" && selectedArticleId) {
      e.preventDefault();
      onToggleBookmark(selectedArticleId);
    }
  }, [articles, selectedArticleId, onSelectArticle, onToggleBookmark]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <AlertCircle className="h-12 w-12 text-[var(--color-error-text)] mb-4" />
        <p className="text-[var(--color-text-secondary)] text-center mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          重新加载
        </Button>
      </div>
    );
  }

  if (isLoading && articles.length === 0) {
    return (
      <div className="divide-y divide-[var(--color-border-secondary)]">
        {[...Array(8)].map((_, i) => (
          <ArticleSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <Inbox className="h-12 w-12 text-[var(--color-text-tertiary)] mb-4" />
        <p className="text-[var(--color-text-secondary)] text-center">
          暂无文章
        </p>
        <p className="text-sm text-[var(--color-text-tertiary)] text-center mt-1">
          尝试调整筛选条件或切换其他来源
        </p>
      </div>
    );
  }

  const CardComponent = compactMode ? CompactArticleCard : ArticleCard;

  return (
    <div ref={listRef} className="divide-y divide-[var(--color-border-secondary)]">
      {articles.map((article) => (
        <CardComponent
          key={article.id}
          article={article}
          isBookmarked={isBookmarked(article.id)}
          isRead={isRead(article.id)}
          isSelected={article.id === selectedArticleId}
          showSource={showSource}
          onSelect={() => onSelectArticle(article)}
          onToggleBookmark={() => onToggleBookmark(article.id)}
          onMarkAsRead={() => onMarkAsRead(article.id)}
          onOpenExternal={() => {
            onMarkAsRead(article.id);
            window.open(article.url, "_blank", "noopener,noreferrer");
          }}
        />
      ))}
      
      {/* Load more trigger */}
      <div ref={loadMoreRef} className="p-4">
        {isLoadingMore && (
          <div className="flex items-center justify-center gap-2 text-[var(--color-text-tertiary)]">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">加载更多...</span>
          </div>
        )}
        {hasMore && !isLoadingMore && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onLoadMore}
          >
            加载更多
          </Button>
        )}
        {!hasMore && articles.length > 0 && (
          <p className="text-center text-sm text-[var(--color-text-tertiary)]">
            已加载全部 {articles.length} 篇文章
          </p>
        )}
      </div>
    </div>
  );
}
