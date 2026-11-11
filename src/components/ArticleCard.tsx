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
    <div className="flex flex-wrap items-center gap-3 text-[13px] text-[var(--color-text-secondary)]">
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
    <div className="flex items-center gap-3 text-[13px] text-[var(--color-text-secondary)]">
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
        "group relative px-4 py-4 cursor-pointer transition-all",
        "border-l-3 border-l-transparent",
        "hover:bg-[var(--color-bg-hover)]",
        isSelected && "bg-[var(--color-bg-hover)] border-l-[var(--color-accent-primary)]",
        isRead && "article-read"
      )}
    >
      <div className="flex gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges - 只保留来源标签，减少视觉噪声 */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {showSource && (
              <Badge variant="secondary" className="text-[11px] font-medium">
                {SOURCE_LABELS[article.source_type]}
              </Badge>
            )}
            {article.category && (
              <Badge variant="outline" className="text-[11px]">
                {article.category}
              </Badge>
            )}
            {isRead && (
              <CheckCircle className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            )}
          </div>

          {/* Title - 增大字号 */}
          <h3
            className={cn(
              "article-title text-[16px] font-medium leading-snug line-clamp-2 mb-2",
              isRead ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
            )}
          >
            {article.title}
          </h3>

          {/* Summary - 增大字号，改善行高 */}
          {article.summary && (
            <p className="text-[14px] text-[var(--color-text-secondary)] line-clamp-2 mb-3 leading-[1.65]">
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

          {/* Meta - 略增字号 */}
          <div className="flex items-center gap-3 text-[13px] text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatRelativeTime(article.published_at)}
            </span>
            {article.author && (
              <span className="flex items-center gap-1 truncate max-w-[140px]">
                <User className="h-3.5 w-3.5" />
                {article.author}
              </span>
            )}
            <span className="truncate max-w-[140px] hidden sm:block">
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
              className="h-4 w-4"
              fill={isBookmarked ? "currentColor" : "none"}
            />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={handleOpenExternal}
            title="在新标签页打开"
          >
            <ExternalLink className="h-4 w-4" />
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
        "group relative px-4 py-3 cursor-pointer transition-all",
        "border-l-3 border-l-transparent",
        "hover:bg-[var(--color-bg-hover)]",
        isSelected && "bg-[var(--color-bg-hover)] border-l-[var(--color-accent-primary)]",
        isRead && "article-read"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {showSource && (
              <Badge variant="secondary" className="text-[11px] shrink-0 font-medium">
                {SOURCE_LABELS[article.source_type]}
              </Badge>
            )}
            <h3
              className={cn(
                "article-title text-[15px] font-medium line-clamp-1 flex-1",
                isRead ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"
              )}
            >
              {article.title}
            </h3>
            <span className="text-[13px] text-[var(--color-text-tertiary)] shrink-0">
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
            <Bookmark className="h-3.5 w-3.5" fill={isBookmarked ? "currentColor" : "none"} />
          </Button>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={(e) => {
              e.stopPropagation();
              onOpenExternal();
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}
