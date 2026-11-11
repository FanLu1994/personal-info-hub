"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { FilterState } from "@/lib/types";
import { SOURCE_CATEGORIES } from "@/lib/types";
import {
  Search,
  X,
  Filter,
  CalendarDays,
  SortDesc,
  CheckCheck,
  Share2,
  LayoutList,
  LayoutGrid,
} from "lucide-react";

interface ToolbarProps {
  filters: FilterState;
  onFiltersChange: (filters: Partial<FilterState>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  categories: string[];
  onMarkAllRead: () => void;
  onMarkAllUnread: () => void;
  onShare: () => void;
  articleCount: number;
  compactMode: boolean;
  onToggleCompact: () => void;
}

export function Toolbar({
  filters,
  onFiltersChange,
  onReset,
  hasActiveFilters,
  categories,
  onMarkAllRead,
  onMarkAllUnread,
  onShare,
  articleCount,
  compactMode,
  onToggleCompact,
}: ToolbarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const sourceCategories = filters.source !== "all" 
    ? SOURCE_CATEGORIES[filters.source] || []
    : [];
  const allCategories = [...new Set([...sourceCategories, ...categories])].sort();

  return (
    <div className="sticky top-0 md:top-0 z-20 bg-[var(--color-bg-primary)] border-b border-[var(--color-border-primary)]">
      {/* Main toolbar */}
      <div className="flex items-center gap-2 p-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
          <Input
            type="search"
            placeholder="搜索标题和摘要..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-9 pr-8"
          />
          {filters.search && (
            <button
              onClick={() => onFiltersChange({ search: "" })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <Button
          variant={showFilters ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">筛选</span>
          {hasActiveFilters && (
            <span className="ml-1 w-2 h-2 rounded-full bg-[var(--color-accent-primary)]" />
          )}
        </Button>

        {/* View toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCompact}
          title={compactMode ? "标准视图" : "紧凑视图"}
          className="shrink-0"
        >
          {compactMode ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
        </Button>

        {/* Actions */}
        <div className="hidden sm:flex items-center gap-1 border-l border-[var(--color-border-primary)] pl-2 ml-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onMarkAllRead}
            title="全部标为已读"
          >
            <CheckCheck className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onShare}
            title="分享当前筛选"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Article count */}
        <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums shrink-0">
          {articleCount} 篇
        </span>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="px-3 pb-3 border-t border-[var(--color-border-secondary)] pt-3">
          <div className="flex flex-wrap gap-3">
            {/* Category */}
            {allCategories.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-text-tertiary)]">分类</span>
                <Select
                  value={filters.category}
                  onChange={(e) => onFiltersChange({ category: e.target.value })}
                  className="w-40"
                >
                  <option value="">全部分类</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </div>
            )}

            {/* Date range */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => onFiltersChange({ dateFrom: e.target.value })}
                className="w-36"
                placeholder="开始日期"
              />
              <span className="text-[var(--color-text-tertiary)]">-</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => onFiltersChange({ dateTo: e.target.value })}
                className="w-36"
                placeholder="结束日期"
              />
            </div>

            {/* Read state */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-tertiary)]">状态</span>
              <Select
                value={filters.readState}
                onChange={(e) => onFiltersChange({ readState: e.target.value as FilterState["readState"] })}
                className="w-28"
              >
                <option value="all">全部</option>
                <option value="unread">未读</option>
                <option value="read">已读</option>
              </Select>
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <SortDesc className="h-4 w-4 text-[var(--color-text-tertiary)]" />
              <Select
                value={filters.sortBy}
                onChange={(e) => onFiltersChange({ sortBy: e.target.value as FilterState["sortBy"] })}
                className="w-28"
              >
                <option value="date">按时间</option>
                <option value="source">按来源</option>
              </Select>
              <Select
                value={filters.sortOrder}
                onChange={(e) => onFiltersChange({ sortOrder: e.target.value as FilterState["sortOrder"] })}
                className="w-24"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </Select>
            </div>

            {/* Reset */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                <X className="h-4 w-4" />
                清除筛选
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
