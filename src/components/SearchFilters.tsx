"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Calendar, X, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  search: string;
  dateFrom: string;
  dateTo: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (search: string) => void;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  onCategoryChange: (category: string) => void;
  onClear: () => void;
}

export function SearchFilters({
  search,
  dateFrom,
  dateTo,
  selectedCategory,
  categories,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
  onCategoryChange,
  onClear,
}: SearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasFilters = search || dateFrom || dateTo || selectedCategory;

  return (
    <div className="bg-white border-b border-neutral-200 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="搜索标题或摘要..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1.5"
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">筛选</span>
          {hasFilters && (
            <span className="ml-1 h-2 w-2 rounded-full bg-neutral-900" />
          )}
        </Button>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} className="gap-1">
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">清除</span>
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="mt-3 pt-3 border-t border-neutral-100">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-neutral-400" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="w-36 h-8 text-sm"
                placeholder="开始日期"
              />
              <span className="text-neutral-400">-</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="w-36 h-8 text-sm"
                placeholder="结束日期"
              />
            </div>
          </div>

          {categories.length > 0 && (
            <div className="mt-3">
              <div className="text-xs text-neutral-500 mb-2">分类筛选</div>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={selectedCategory === "" ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    selectedCategory === "" && "ring-2 ring-neutral-900 ring-offset-1"
                  )}
                  onClick={() => onCategoryChange("")}
                >
                  全部
                </Badge>
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedCategory === category && "ring-2 ring-neutral-900 ring-offset-1"
                    )}
                    onClick={() => onCategoryChange(category)}
                  >
                    {category}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
