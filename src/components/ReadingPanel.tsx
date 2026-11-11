"use client";

import { useEffect } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, type Article } from "@/lib/types";
import {
  X,
  ExternalLink,
  Bookmark,
  Clock,
  User,
  Star,
  TrendingUp,
  MessageSquare,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface ReadingPanelProps {
  article: Article | null;
  isBookmarked: boolean;
  isRead: boolean;
  onClose: () => void;
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

export function ReadingPanel({
  article,
  isBookmarked,
  isRead,
  onClose,
  onToggleBookmark,
  onMarkAsRead,
  onOpenExternal,
}: ReadingPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && article) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [article, onClose]);

  if (!article) {
    return (
      <div className="hidden xl:flex flex-col items-center justify-center h-full bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]">
        <p className="text-[15px]">选择一篇文章开始阅读</p>
      </div>
    );
  }

  const rawData = parseRawData(article);

  return (
    <aside className="hidden xl:flex flex-col h-screen sticky top-0 w-[var(--reading-panel-width)] min-w-[var(--reading-panel-min-width)] border-l border-[var(--color-border-primary)] bg-[var(--color-bg-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-secondary)]">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[12px] font-medium">{SOURCE_LABELS[article.source_type]}</Badge>
          {article.category && (
            <Badge variant="outline" className="text-[12px]">{article.category}</Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-tertiary)] mr-2">ESC 关闭</span>
          <Button variant="ghost" size="iconSm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
        {/* Warning for raw content */}
        {article.is_raw_headline && (
          <div className="flex items-start gap-2 p-3 mb-5 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
            <AlertCircle className="h-4 w-4 text-[var(--color-warning-text)] shrink-0 mt-0.5" />
            <p className="text-[13px] text-[var(--color-warning-text)]">
              此内容为原始抓取，直接来自公开 Feed/API，未经验证或摘要处理。
            </p>
          </div>
        )}

        {/* Title - 增大字号 */}
        <h1 className="text-[22px] font-semibold text-[var(--color-text-primary)] leading-[1.35] mb-5">
          {article.title}
        </h1>

        {/* Meta - 增大字号 */}
        <div className="flex flex-wrap items-center gap-4 mb-5 text-[14px] text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatRelativeTime(article.published_at)}
          </span>
          {article.author && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {article.author}
            </span>
          )}
          {isRead && (
            <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              已读
            </span>
          )}
        </div>

        {/* Prominent external link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors text-[14px] font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
          阅读原文
        </a>

        {/* Source-specific metadata */}
        {article.source_type === "github" && rawData && (
          <div className="flex flex-wrap items-center gap-4 mb-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
            {rawData.language && (
              <span className="flex items-center gap-1.5 text-[14px]">
                <span className="w-3 h-3 rounded-full bg-[var(--color-accent-primary)]" />
                {rawData.language}
              </span>
            )}
            {rawData.stars !== undefined && (
              <span className="flex items-center gap-1.5 text-[14px]">
                <Star className="h-4 w-4 text-amber-500" />
                {rawData.stars.toLocaleString()} stars
              </span>
            )}
            {rawData.starsToday !== undefined && rawData.starsToday > 0 && (
              <span className="flex items-center gap-1.5 text-[14px] text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                +{rawData.starsToday} today
              </span>
            )}
            {rawData.forks !== undefined && rawData.forks > 0 && (
              <span className="text-[14px]">
                🍴 {rawData.forks.toLocaleString()} forks
              </span>
            )}
          </div>
        )}

        {article.source_type === "hackernews" && rawData && (
          <div className="flex flex-wrap items-center gap-4 mb-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
            {rawData.score !== undefined && (
              <span className="flex items-center gap-1.5 text-[14px]">
                <TrendingUp className="h-4 w-4" />
                {rawData.score} points
              </span>
            )}
            {rawData.comments !== undefined && (
              <a
                href={rawData.hn_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[14px] hover:text-[var(--color-accent-primary)] transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                {rawData.comments} 评论
              </a>
            )}
            {rawData.original_url && rawData.original_url !== rawData.hn_url && (
              <span className="text-[13px] text-[var(--color-text-tertiary)]">
                原文链接
              </span>
            )}
          </div>
        )}

        {/* Summary / Content - 增大字号和行高 */}
        {article.summary && (
          <div className="prose prose-base dark:prose-invert max-w-none">
            <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] whitespace-pre-wrap">
              {article.summary.replace(/^\[.*?\]\s*/, "")}
            </p>
          </div>
        )}

        {article.content && article.content !== article.summary && (
          <div className="mt-5 prose prose-base dark:prose-invert max-w-none">
            <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] whitespace-pre-wrap">
              {article.content}
            </p>
          </div>
        )}

        {/* Source info */}
        <div className="mt-8 pt-4 border-t border-[var(--color-border-secondary)]">
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            来源：{article.source_name}
          </p>
          {article.fetched_at && (
            <p className="text-[13px] text-[var(--color-text-tertiary)] mt-1">
              抓取于：{new Date(article.fetched_at).toLocaleString("zh-CN")}
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--color-border-secondary)]">
        <Button
          variant={isBookmarked ? "secondary" : "outline"}
          size="sm"
          onClick={onToggleBookmark}
          className="flex-1 h-9 text-[14px]"
        >
          <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
          {isBookmarked ? "已收藏" : "收藏"}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onOpenExternal}
          className="flex-1 h-9 text-[14px]"
        >
          <ExternalLink className="h-4 w-4" />
          阅读原文
        </Button>
      </div>
    </aside>
  );
}

export function MobileReadingPanel({
  article,
  isBookmarked,
  isRead,
  onClose,
  onToggleBookmark,
  onMarkAsRead,
  onOpenExternal,
}: ReadingPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && article) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [article, onClose]);

  if (!article) return null;

  const rawData = parseRawData(article);

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-bg-primary)] xl:hidden overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          返回
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBookmark}
            className={cn(isBookmarked && "text-amber-500")}
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onOpenExternal}>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-[12px] font-medium">{SOURCE_LABELS[article.source_type]}</Badge>
          {article.category && (
            <Badge variant="outline" className="text-[12px]">{article.category}</Badge>
          )}
        </div>

        <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)] leading-[1.35] mb-4">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-3 mb-4 text-[14px] text-[var(--color-text-tertiary)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {formatRelativeTime(article.published_at)}
          </span>
          {article.author && (
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {article.author}
            </span>
          )}
        </div>

        {/* Prominent external link */}
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors text-[14px] font-medium"
        >
          <ExternalLink className="h-4 w-4" />
          阅读原文
        </a>

        {article.summary && (
          <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] whitespace-pre-wrap">
            {article.summary.replace(/^\[.*?\]\s*/, "")}
          </p>
        )}

        <div className="mt-8 pt-4 border-t border-[var(--color-border-secondary)]">
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            来源：{article.source_name}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 px-4 py-4 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-primary)]">
        <Button variant="default" className="w-full h-11 text-[15px]" onClick={onOpenExternal}>
          <ExternalLink className="h-4 w-4" />
          阅读原文
        </Button>
      </div>
    </div>
  );
}

export function OverlayReadingPanel({
  article,
  isBookmarked,
  isRead,
  onClose,
  onToggleBookmark,
  onMarkAsRead,
  onOpenExternal,
}: ReadingPanelProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && article) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [article, onClose]);

  if (!article) return null;

  const rawData = parseRawData(article);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-30 hidden md:block xl:hidden"
        onClick={onClose}
      />
      <aside className="reading-panel-overlay hidden md:flex xl:hidden flex-col h-screen bg-[var(--color-bg-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-secondary)]">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[12px] font-medium">{SOURCE_LABELS[article.source_type]}</Badge>
            {article.category && (
              <Badge variant="outline" className="text-[12px]">{article.category}</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-text-tertiary)] mr-2">ESC 关闭</span>
            <Button variant="ghost" size="iconSm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
          {article.is_raw_headline && (
            <div className="flex items-start gap-2 p-3 mb-5 rounded-lg bg-[var(--color-warning-bg)] border border-[var(--color-warning-border)]">
              <AlertCircle className="h-4 w-4 text-[var(--color-warning-text)] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[var(--color-warning-text)]">
                此内容为原始抓取，直接来自公开 Feed/API，未经验证或摘要处理。
              </p>
            </div>
          )}

          <h1 className="text-[20px] font-semibold text-[var(--color-text-primary)] leading-[1.35] mb-5">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 mb-5 text-[14px] text-[var(--color-text-tertiary)]">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatRelativeTime(article.published_at)}
            </span>
            {article.author && (
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {article.author}
              </span>
            )}
          </div>

          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 mb-5 rounded-lg bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-hover)] transition-colors text-[14px] font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            阅读原文
          </a>

          {article.source_type === "github" && rawData && (
            <div className="flex flex-wrap items-center gap-4 mb-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
              {rawData.language && (
                <span className="flex items-center gap-1.5 text-[14px]">
                  <span className="w-3 h-3 rounded-full bg-[var(--color-accent-primary)]" />
                  {rawData.language}
                </span>
              )}
              {rawData.stars !== undefined && (
                <span className="flex items-center gap-1.5 text-[14px]">
                  <Star className="h-4 w-4 text-amber-500" />
                  {rawData.stars.toLocaleString()} stars
                </span>
              )}
              {rawData.starsToday !== undefined && rawData.starsToday > 0 && (
                <span className="flex items-center gap-1.5 text-[14px] text-green-600 dark:text-green-400">
                  <TrendingUp className="h-4 w-4" />
                  +{rawData.starsToday} today
                </span>
              )}
            </div>
          )}

          {article.source_type === "hackernews" && rawData && (
            <div className="flex flex-wrap items-center gap-4 mb-5 p-4 rounded-lg bg-[var(--color-bg-secondary)]">
              {rawData.score !== undefined && (
                <span className="flex items-center gap-1.5 text-[14px]">
                  <TrendingUp className="h-4 w-4" />
                  {rawData.score} points
                </span>
              )}
              {rawData.comments !== undefined && (
                <a
                  href={rawData.hn_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[14px] hover:text-[var(--color-accent-primary)] transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  {rawData.comments} 评论
                </a>
              )}
            </div>
          )}

          {article.summary && (
            <p className="text-[15px] text-[var(--color-text-secondary)] leading-[1.75] whitespace-pre-wrap">
              {article.summary.replace(/^\[.*?\]\s*/, "")}
            </p>
          )}

          <div className="mt-8 pt-4 border-t border-[var(--color-border-secondary)]">
            <p className="text-[13px] text-[var(--color-text-tertiary)]">
              来源：{article.source_name}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-[var(--color-border-secondary)]">
          <Button
            variant={isBookmarked ? "secondary" : "outline"}
            size="sm"
            onClick={onToggleBookmark}
            className="flex-1 h-9 text-[14px]"
          >
            <Bookmark className="h-4 w-4" fill={isBookmarked ? "currentColor" : "none"} />
            {isBookmarked ? "已收藏" : "收藏"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onOpenExternal}
            className="flex-1 h-9 text-[14px]"
          >
            <ExternalLink className="h-4 w-4" />
            阅读原文
          </Button>
        </div>
      </aside>
    </>
  );
}
