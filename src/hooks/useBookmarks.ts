"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const BOOKMARKS_KEY = "info-digest-bookmarks";

function getStoredBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(BOOKMARKS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored));
    }
  } catch {
    console.error("Failed to load bookmarks");
  }
  return new Set();
}

export function useBookmarks() {
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => getStoredBookmarks());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const saveBookmarks = useCallback((newBookmarks: Set<string>) => {
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...newBookmarks]));
    } catch {
      console.error("Failed to save bookmarks");
    }
  }, []);

  const toggleBookmark = useCallback(
    (articleId: string) => {
      setBookmarks((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(articleId)) {
          newSet.delete(articleId);
        } else {
          newSet.add(articleId);
        }
        saveBookmarks(newSet);
        return newSet;
      });
    },
    [saveBookmarks]
  );

  const isBookmarked = useCallback(
    (articleId: string) => bookmarks.has(articleId),
    [bookmarks]
  );

  const bookmarkCount = useMemo(() => bookmarks.size, [bookmarks]);

  return { bookmarks, toggleBookmark, isBookmarked, isLoaded, bookmarkCount };
}
