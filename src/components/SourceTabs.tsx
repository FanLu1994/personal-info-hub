"use client";

import { cn } from "@/lib/utils";
import { SOURCE_LABELS, type SourceType } from "@/lib/types";
import {
  Rss,
  MessageSquare,
  Flame,
  Github,
  LayoutGrid,
  Bookmark,
} from "lucide-react";

interface SourceTabsProps {
  activeSource: SourceType | "all" | "bookmarks";
  onSourceChange: (source: SourceType | "all" | "bookmarks") => void;
  counts?: Record<SourceType | "all", number>;
  bookmarkCount?: number;
}

const TABS: { key: SourceType | "all" | "bookmarks"; icon: React.ReactNode }[] = [
  { key: "all", icon: <LayoutGrid className="h-4 w-4" /> },
  { key: "rss", icon: <Rss className="h-4 w-4" /> },
  { key: "linuxdo", icon: <MessageSquare className="h-4 w-4" /> },
  { key: "hackernews", icon: <Flame className="h-4 w-4" /> },
  { key: "github", icon: <Github className="h-4 w-4" /> },
  { key: "bookmarks", icon: <Bookmark className="h-4 w-4" /> },
];

export function SourceTabs({
  activeSource,
  onSourceChange,
  counts,
  bookmarkCount,
}: SourceTabsProps) {
  const getLabel = (key: SourceType | "all" | "bookmarks") => {
    if (key === "all") return "最新汇总";
    if (key === "bookmarks") return "收藏";
    return SOURCE_LABELS[key];
  };

  const getCount = (key: SourceType | "all" | "bookmarks") => {
    if (key === "bookmarks") return bookmarkCount ?? 0;
    return counts?.[key] ?? 0;
  };

  return (
    <div className="border-b border-neutral-200 bg-white">
      <nav className="flex overflow-x-auto scrollbar-hide">
        {TABS.map(({ key, icon }) => (
          <button
            key={key}
            onClick={() => onSourceChange(key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              activeSource === key
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
            )}
          >
            {icon}
            <span>{getLabel(key)}</span>
            {getCount(key) > 0 && (
              <span className="ml-1 text-xs text-neutral-400">
                ({getCount(key) > 999 ? "999+" : getCount(key)})
              </span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
