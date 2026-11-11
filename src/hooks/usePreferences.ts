"use client";

import { useState, useEffect, useCallback } from "react";

const PREFERENCES_KEY = "info-digest-preferences";

interface Preferences {
  showRawHeadlineLabel: boolean;
  compactMode: boolean;
  readArticles: string[];
}

const defaultPreferences: Preferences = {
  showRawHeadlineLabel: true,
  compactMode: false,
  readArticles: [],
};

function getStoredPreferences(): Preferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = localStorage.getItem(PREFERENCES_KEY);
    if (stored) {
      return { ...defaultPreferences, ...JSON.parse(stored) };
    }
  } catch {
    console.error("Failed to load preferences");
  }
  return defaultPreferences;
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(() => getStoredPreferences());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const updatePreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((prev) => {
        const newPrefs = { ...prev, [key]: value };
        try {
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
        } catch {
          console.error("Failed to save preferences");
        }
        return newPrefs;
      });
    },
    []
  );

  const markAsRead = useCallback(
    (articleId: string) => {
      setPreferences((prev) => {
        if (prev.readArticles.includes(articleId)) return prev;
        const newReadArticles = [...prev.readArticles, articleId].slice(-500);
        const newPrefs = { ...prev, readArticles: newReadArticles };
        try {
          localStorage.setItem(PREFERENCES_KEY, JSON.stringify(newPrefs));
        } catch {
          console.error("Failed to save preferences");
        }
        return newPrefs;
      });
    },
    []
  );

  const isRead = useCallback(
    (articleId: string) => preferences.readArticles.includes(articleId),
    [preferences.readArticles]
  );

  return { preferences, updatePreference, markAsRead, isRead, isLoaded };
}
