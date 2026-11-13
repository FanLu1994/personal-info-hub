"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { FilterState, SourceType, DateRange } from "@/lib/types";
import { DEFAULT_FILTER_STATE } from "@/lib/types";

function parseUrlParams(): Partial<FilterState> {
  if (typeof window === "undefined") return {};
  
  const params = new URLSearchParams(window.location.search);
  const filters: Partial<FilterState> = {};
  
  const source = params.get("source");
  if (source && (source === "all" || ["rss", "linuxdo", "hackernews", "github"].includes(source))) {
    filters.source = source as SourceType | "all";
  }
  
  const category = params.get("category");
  if (category) filters.category = category;
  
  const search = params.get("q");
  if (search) filters.search = search;
  
  const dateRange = params.get("range");
  if (dateRange && ["all", "today", "3days", "7days", "custom"].includes(dateRange)) {
    filters.dateRange = dateRange as DateRange;
  }
  
  const dateFrom = params.get("from");
  if (dateFrom) {
    filters.dateFrom = dateFrom;
    if (!dateRange) filters.dateRange = "custom";
  }
  
  const dateTo = params.get("to");
  if (dateTo) {
    filters.dateTo = dateTo;
    if (!dateRange) filters.dateRange = "custom";
  }
  
  const readState = params.get("read");
  if (readState && ["all", "unread", "read"].includes(readState)) {
    filters.readState = readState as "all" | "unread" | "read";
  }
  
  const sortBy = params.get("sort");
  if (sortBy && ["date", "source"].includes(sortBy)) {
    filters.sortBy = sortBy as "date" | "source";
  }
  
  const sortOrder = params.get("order");
  if (sortOrder && ["asc", "desc"].includes(sortOrder)) {
    filters.sortOrder = sortOrder as "asc" | "desc";
  }
  
  return filters;
}

function filtersToUrlParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.source !== "all") params.set("source", filters.source);
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("q", filters.search);
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (filters.dateRange === "custom") {
    if (filters.dateFrom) params.set("from", filters.dateFrom);
    if (filters.dateTo) params.set("to", filters.dateTo);
  }
  if (filters.readState !== "all") params.set("read", filters.readState);
  if (filters.sortBy !== "date") params.set("sort", filters.sortBy);
  if (filters.sortOrder !== "desc") params.set("order", filters.sortOrder);
  
  return params;
}

export function useFilters() {
  const [filters, setFiltersState] = useState<FilterState>(DEFAULT_FILTER_STATE);
  const [isInitialized, setIsInitialized] = useState(false);
  const skipUrlUpdate = useRef(true);

  useEffect(() => {
    const urlFilters = parseUrlParams();
    const mergedFilters = { ...DEFAULT_FILTER_STATE, ...urlFilters };
    setFiltersState(mergedFilters);
    setIsInitialized(true);
    skipUrlUpdate.current = false;
  }, []);

  useEffect(() => {
    if (skipUrlUpdate.current || typeof window === "undefined") return;
    
    const params = filtersToUrlParams(filters);
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, "", newUrl);
  }, [filters]);

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTER_STATE);
  }, []);

  const getShareableUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    const params = filtersToUrlParams(filters);
    const baseUrl = window.location.origin + window.location.pathname;
    return params.toString() ? `${baseUrl}?${params.toString()}` : baseUrl;
  }, [filters]);

  const hasActiveFilters = 
    filters.source !== "all" ||
    filters.category !== "" ||
    filters.search !== "" ||
    filters.dateRange !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.readState !== "all";

  return {
    filters,
    setFilters,
    resetFilters,
    getShareableUrl,
    hasActiveFilters,
    isInitialized,
  };
}
