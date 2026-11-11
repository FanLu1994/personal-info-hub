"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const READ_KEY = "info-digest-read";
const PREFS_KEY = "info-digest-prefs";

interface Preferences {
  compactMode: boolean;
  showReadArticles: boolean;
  autoMarkRead: boolean;
}

const DEFAULT_PREFS: Preferences = {
  compactMode: false,
  showReadArticles: true,
  autoMarkRead: true,
};

function getStoredReadArticles(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = localStorage.getItem(READ_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (Array.isArray(data.ids)) {
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        const validIds = data.ids.filter((item: { id: string; ts: number }) => 
          item.ts > thirtyDaysAgo
        );
        return new Set(validIds.map((item: { id: string }) => item.id));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
}

function saveReadArticles(readArticles: Map<string, number>) {
  try {
    const ids = Array.from(readArticles.entries()).map(([id, ts]) => ({ id, ts }));
    localStorage.setItem(READ_KEY, JSON.stringify({ ids }));
  } catch {
    // ignore
  }
}

function getStoredPrefs(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export function usePreferences() {
  const [readMap, setReadMap] = useState<Map<string, number>>(new Map());
  const [prefs, setPrefsState] = useState<Preferences>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedRead = getStoredReadArticles();
    const newMap = new Map<string, number>();
    storedRead.forEach(id => newMap.set(id, Date.now()));
    setReadMap(newMap);
    setPrefsState(getStoredPrefs());
    setIsLoaded(true);
  }, []);

  const markAsRead = useCallback((articleId: string) => {
    setReadMap(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(articleId)) {
        newMap.set(articleId, Date.now());
        saveReadArticles(newMap);
      }
      return newMap;
    });
  }, []);

  const markAsUnread = useCallback((articleId: string) => {
    setReadMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(articleId);
      saveReadArticles(newMap);
      return newMap;
    });
  }, []);

  const markAllAsRead = useCallback((articleIds: string[]) => {
    setReadMap(prev => {
      const newMap = new Map(prev);
      const now = Date.now();
      articleIds.forEach(id => {
        if (!newMap.has(id)) {
          newMap.set(id, now);
        }
      });
      saveReadArticles(newMap);
      return newMap;
    });
  }, []);

  const markAllAsUnread = useCallback((articleIds: string[]) => {
    setReadMap(prev => {
      const newMap = new Map(prev);
      articleIds.forEach(id => newMap.delete(id));
      saveReadArticles(newMap);
      return newMap;
    });
  }, []);

  const isRead = useCallback((articleId: string) => readMap.has(articleId), [readMap]);

  const readCount = useMemo(() => readMap.size, [readMap]);

  const setPrefs = useCallback((newPrefs: Partial<Preferences>) => {
    setPrefsState(prev => {
      const updated = { ...prev, ...newPrefs };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  }, []);

  return {
    markAsRead,
    markAsUnread,
    markAllAsRead,
    markAllAsUnread,
    isRead,
    readCount,
    prefs,
    setPrefs,
    isLoaded,
  };
}
