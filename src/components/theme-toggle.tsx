"use client";

import { useEffect } from "react";

const STORAGE_KEY = "arewecooked-theme";

export function ThemeToggle() {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
      document.documentElement.dataset.theme = storedTheme;
    }
  }, []);

  function toggleTheme() {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return (
    <button
      aria-label="Toggle color theme"
      className="inline-flex min-h-9 items-center gap-2 rounded-[9px] border border-border bg-panel px-[11px] text-[13px] text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
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
