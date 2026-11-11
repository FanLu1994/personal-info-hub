"use client";

import { ArticleCard } from "./ArticleCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/types";
import { FileQuestion, RefreshCw } from "lucide-react";

interface ArticleListProps {
  articles: Article[];
  isLoading: boolean;
  hasMore: boolean;
  isBookmarked: (id: string) => boolean;
  isRead: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onLoadMore: () => void;
  showSource?: boolean;
}

export function ArticleList({
  articles,
  isLoading,
  hasMore,
  isBookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsRead,
  onLoadMore,
  showSource = false,
}: ArticleListProps) {
  if (isLoading && articles.length === 0) {
    return (
      <div className="divide-y divide-neutral-100">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-4 px-4">
            <div className="flex gap-2 mb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-4 mt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <FileQuestion className="h-12 w-12 text-neutral-300 mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-1">暂无内容</h3>
        <p className="text-sm text-neutral-500">
          当前筛选条件下没有找到任何文章
        </p>
      </div>
    );
  }

  return (
    <div className="px-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          isBookmarked={isBookmarked(article.id)}
          isRead={isRead(article.id)}
          onToggleBookmark={() => onToggleBookmark(article.id)}
          onMarkAsRead={() => onMarkAsRead(article.id)}
          showSource={showSource}
        />
      ))}

      {hasMore && (
        <div className="py-6 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                加载中...
              </>
            ) : (
              "加载更多"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
