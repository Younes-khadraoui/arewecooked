"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "arewecooked-theme";
const THEME_CHANGE_EVENT = "arewecooked-theme-change";

function getThemeSnapshot(): "dark" | "light" {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerThemeSnapshot(): "dark" {
  return "dark";
}

function subscribeToThemeChanges(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function updateTheme(theme: "dark" | "light") {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.localStorage.setItem(STORAGE_KEY, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      updateTheme(storedTheme);
    }
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    updateTheme(nextTheme);
  }

  return (
    <button
      aria-label="Color theme"
      aria-pressed={theme === "light"}
      className="inline-flex min-h-9 items-center gap-2 rounded-[9px] border border-border bg-panel px-[11px] text-[13px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      onClick={toggleTheme}
      type="button"
    >
      <span aria-hidden="true" className="text-base leading-none text-accent-soft">
        ◐
      </span>
      <span>Theme</span>
    </button>
  );
}
