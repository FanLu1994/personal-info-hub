"use client";

import { useState, useEffect, useCallback } from "react";

type Theme = "light" | "dark" | "system";

const THEME_KEY = "info-digest-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "system";
}

function applyTheme(theme: Theme) {
  if (typeof window === "undefined") return;
  
  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  
  if (effectiveTheme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
    setMounted(true);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const current = getStoredTheme();
      if (current === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // ignore
    }
    applyTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentEffective = theme === "system" ? getSystemTheme() : theme;
    setTheme(currentEffective === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const effectiveTheme = theme === "system" ? getSystemTheme() : theme;

  return { theme, effectiveTheme, setTheme, toggleTheme, mounted };
}
