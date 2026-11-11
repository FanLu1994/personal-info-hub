"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SourceType, ViewType } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/types";
import {
  Newspaper,
  Rss,
  MessageCircle,
  Flame,
  Github,
  Bookmark,
  Sun,
  Moon,
  RefreshCw,
  X,
  Menu,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface SidebarProps {
  activeSource: ViewType;
  onSourceChange: (source: ViewType) => void;
  counts: Record<SourceType | "all", number>;
  bookmarkCount: number;
  unreadCount: number;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  lastUpdated: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const sourceIcons: Record<SourceType | "all" | "bookmarks", React.ReactNode> = {
  all: <Newspaper className="h-4 w-4" />,
  rss: <Rss className="h-4 w-4" />,
  linuxdo: <MessageCircle className="h-4 w-4" />,
  hackernews: <Flame className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
  bookmarks: <Bookmark className="h-4 w-4" />,
};

export function Sidebar({
  activeSource,
  onSourceChange,
  counts,
  bookmarkCount,
  unreadCount,
  theme,
  onToggleTheme,
  lastUpdated,
  isOpen,
  onClose,
}: SidebarProps) {
  const sources: (SourceType | "all")[] = ["all", "rss", "linuxdo", "hackernews", "github"];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}
      
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-50 h-screen w-[var(--sidebar-width)] flex flex-col",
          "bg-[var(--color-bg-primary)] border-r border-[var(--color-border-primary)]",
          "transition-transform duration-200 ease-in-out",
          "md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border-secondary)]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[var(--color-text-primary)] rounded-md">
              <Newspaper className="h-4 w-4 text-[var(--color-bg-primary)]" />
            </div>
            <span className="font-semibold text-[var(--color-text-primary)]">信息聚合</span>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2">
          <div className="space-y-1">
            {sources.map(source => (
              <button
                key={source}
                onClick={() => {
                  onSourceChange(source);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                  "hover:bg-[var(--color-bg-hover)]",
                  activeSource === source 
                    ? "bg-[var(--color-bg-active)] text-[var(--color-text-primary)] font-medium" 
                    : "text-[var(--color-text-secondary)]"
                )}
              >
                {sourceIcons[source]}
                <span className="flex-1 text-left">
                  {source === "all" ? "全部" : SOURCE_LABELS[source]}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
                  {counts[source] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)]">
            <button
              onClick={() => {
                onSourceChange("bookmarks");
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                "hover:bg-[var(--color-bg-hover)]",
                activeSource === "bookmarks"
                  ? "bg-[var(--color-bg-active)] text-[var(--color-text-primary)] font-medium"
                  : "text-[var(--color-text-secondary)]"
              )}
            >
              {sourceIcons.bookmarks}
              <span className="flex-1 text-left">收藏</span>
              <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
                {bookmarkCount}
              </span>
            </button>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-[var(--color-border-secondary)] px-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <Clock className="h-3 w-3" />
              <span>未读</span>
              <span className="ml-auto tabular-nums">{unreadCount}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
              <CheckCircle2 className="h-3 w-3" />
              <span>已读</span>
              <span className="ml-auto tabular-nums">{counts.all - unreadCount}</span>
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--color-border-secondary)] space-y-2">
          {lastUpdated && (
            <div className="flex items-center gap-2 px-2 text-xs text-[var(--color-text-tertiary)]">
              <RefreshCw className="h-3 w-3" />
              <span>更新于 {new Date(lastUpdated).toLocaleString("zh-CN", { 
                month: "numeric", 
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTheme}
              className="flex-1 justify-start"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-4 w-4" />
                  <span>浅色模式</span>
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  <span>深色模式</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({
  onMenuClick,
  title,
}: {
  onMenuClick: () => void;
  title: string;
}) {
  return (
    <header className="sticky top-0 z-30 md:hidden flex items-center gap-3 p-3 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="font-medium text-[var(--color-text-primary)]">{title}</span>
    </header>
  );
}
