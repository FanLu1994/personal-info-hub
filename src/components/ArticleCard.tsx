"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SOURCE_LABELS, type Article } from "@/lib/types";
import { 
  Bookmark, 
  ExternalLink, 
  Clock, 
  User, 
  MessageSquare,
  Star,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

interface ArticleCardProps {
  article: Article;
  isBookmarked: boolean;
  isRead: boolean;
  isSelected?: boolean;
  showSource?: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
  onMarkAsRead: () => void;
  onOpenExternal: () => void;
}

function parseRawData(article: Article) {
  if (!article.raw_data) return null;
  try {
    return JSON.parse(article.raw_data);
  } catch {
    return null;
  }
}

function GitHubMeta({ rawData }: { rawData: Record<string, unknown> }) {
  const stars = rawData.stars as number | undefined;
  const starsToday = rawData.starsToday as number | undefined;
  const language = rawData.language as string | undefined;
  const forks = rawData.forks as number | undefined;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
      {language && (
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />
          {language}
        </span>
      )}
      {stars !== undefined && (
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3" />
          {stars.toLocaleString()}
        </span>
      )}
      {starsToday !== undefined && starsToday > 0 && (
        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <TrendingUp className="h-3 w-3" />
          +{starsToday}
        </span>
      )}
      {forks !== undefined && forks > 0 && (
        <span className="flex items-center gap-1">
          🍴 {forks.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function HNMeta({ rawData }: { rawData: Record<string, unknown> }) {
  const score = rawData.score as number | undefined;
  const comments = rawData.comments as number | undefined;
  const hnUrl = rawData.hn_url as string | undefined;

  return (
    <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
      {score !== undefined && (
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          {score} points
        </span>
      )}
      {comments !== undefined && (
        <a
          href={hnUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-[var(--color-accent-primary)] transition-colors"
          onClick={e => e.stopPropagation()}
        >
          <MessageSquare className="h-3 w-3" />
          {comments} 评论
        </a>
      )}
    </div>
  );
}

export function ArticleCard({
  article,
  isBookmarked,
  isRead,
  isSelected = false,
  showSource = false,
  onSelect,
  onToggleBookmark,
  onMarkAsRead,
  onOpenExternal,
}: ArticleCardProps) {
  const rawData = parseRawData(article);

  const handleClick = () => {
    onSelect();
    onMarkAsRead();
  };

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenExternal();
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        "group relative px-4 py-3 cursor-pointer transition-all",
        "border-l-3 border-l-transparent",
        "hover:bg-[var(--color-bg-hover)]",
        isSelected && "bg-[var(--color-bg-hover)] border-l-[var(--color-accent-primary)]",
        isRead && "opacity-60"
      )}
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {showSource && (
              <Badge variant="secondary" className="text-[10px]">
                {SOURCE_LABELS[article.source_type]}
              </Badge>
            )}
            {article.category && (
              <Badge variant="outline" className="text-[10px]">
                {article.category}
              </Badge>
            )}
            {article.is_raw_headline && (
              <Badge variant="warning" className="text-[10px]">
                原始标题
              </Badge>
            )}
            {isRead && (
              <CheckCircle className="h-3 w-3 text-[var(--color-text-tertiary)]" />
            )}
          </div>

          {/* Title */}
          <h3
            className={cn(
              "text-sm font-medium leading-snug line-clamp-2 mb-1",
              isRead ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
            )}
          >
            {article.title}
          </h3>

          {/* Summary */}
          {article.summary && (
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-2 leading-relaxed">
              {article.summary.replace(/^\[.*?\]\s*/, "")}
            </p>
          )}

          {/* Source-specific metadata */}
          {article.source_type === "github" && rawData && (
            <div className="mb-2">
              <GitHubMeta rawData={rawData} />
            </div>
          )}
          {article.source_type === "hackernews" && rawData && (
            <div className="mb-2">
              <HNMeta rawData={rawData} />
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelativeTime(article.published_at)}
            </span>
            {article.author && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <User className="h-3 w-3" />
                {article.author}
              </span>
            )}
            <span className="truncate max-w-[120px] hidden sm:block">
              {article.source_name}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className={cn(
              isBookmarked && "text-amber-500 bg-amber-50 dark:bg-amber-900/20"
            )}
            title={isBookmarked ? "取消收藏" : "收藏"}
          >
            <Bookmark
              className="h-3.5 w-3.5"
              fill={isBookmarked ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={handleOpenExternal}
            title="在新标签页打开"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function CompactArticleCard({
  article,
  isBookmarked,
  isRead,
  isSelected = false,
  showSource = false,
  onSelect,
  onToggleBookmark,
  onMarkAsRead,
  onOpenExternal,
}: ArticleCardProps) {
  const handleClick = () => {
    onSelect();
    onMarkAsRead();
  };

  return (
    <article
      onClick={handleClick}
      className={cn(
        "group relative px-4 py-2 cursor-pointer transition-all",
        "border-l-3 border-l-transparent",
        "hover:bg-[var(--color-bg-hover)]",
        isSelected && "bg-[var(--color-bg-hover)] border-l-[var(--color-accent-primary)]",
        isRead && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showSource && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {SOURCE_LABELS[article.source_type]}
              </Badge>
            )}
            <h3
              className={cn(
                "text-sm font-medium line-clamp-1 flex-1",
                isRead ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-primary)]"
              )}
            >
              {article.title}
            </h3>
            <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">
              {formatRelativeTime(article.published_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark();
            }}
            className={cn(
              isBookmarked && "text-amber-500"
            )}
          >
            <Bookmark className="h-3 w-3" fill={isBookmarked ? "currentColor" : "none"} />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenExternal();
            }}
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </article>
  );
}
