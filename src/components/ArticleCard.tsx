"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, type Article } from "@/lib/types";
import { Bookmark, ExternalLink, Clock, User } from "lucide-react";

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  isRead: boolean;
  onToggleBookmark: () => void;
  onMarkAsRead: () => void;
  showSource?: boolean;
}

export function ArticleCard({
  article,
  isBookmarked,
  isRead,
  onToggleBookmark,
  onMarkAsRead,
  showSource = false,
}: ArticleCardProps) {
  const handleClick = () => {
    onMarkAsRead();
    window.open(article.url, "_blank", "noopener,noreferrer");
  };

  return (
    <article
      className={cn(
        "group relative border-b border-neutral-100 py-4 transition-colors hover:bg-neutral-50/50",
        isRead && "opacity-60"
      )}
    >
      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1.5">
            {showSource && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {SOURCE_LABELS[article.source_type]}
              </Badge>
            )}
            {article.category && (
              <Badge variant="outline" className="shrink-0 text-xs">
                {article.category}
              </Badge>
            )}
            {article.is_raw_headline && (
              <Badge variant="warning" className="shrink-0 text-xs">
                原始标题
              </Badge>
            )}
          </div>

          <h3
            onClick={handleClick}
            className={cn(
              "text-base font-medium leading-snug cursor-pointer hover:text-neutral-700 transition-colors line-clamp-2",
              isRead ? "text-neutral-500" : "text-neutral-900"
            )}
          >
            {article.title}
          </h3>

          {article.summary && (
            <p className="mt-1.5 text-sm text-neutral-600 line-clamp-2 leading-relaxed">
              {article.summary}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-neutral-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(article.published_at)}
            </span>
            {article.author && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <User className="h-3 w-3" />
                {article.author}
              </span>
            )}
            <span className="truncate max-w-[150px]">
              {article.source_name}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className={cn(
              "p-2 rounded-full transition-colors",
              isBookmarked
                ? "text-amber-500 bg-amber-50 hover:bg-amber-100"
                : "text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100"
            )}
            title={isBookmarked ? "取消收藏" : "收藏"}
          >
            <Bookmark
              className="h-4 w-4"
              fill={isBookmarked ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={handleClick}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
            title="打开链接"
          >
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
