"use client";

import { createContext, useCallback, useContext, useLayoutEffect, useSyncExternalStore, type ReactNode } from "react";

import { DARK_PALETTE, LIGHT_PALETTE, type MemoryPalette } from "@/lib/memory/memory-constants";

export type ColorTheme = "light" | "dark";

const STORAGE_KEY = "memory-theme";

type ThemeContextValue = {
  theme: ColorTheme;
  palette: MemoryPalette;
  setTheme: (theme: ColorTheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

let currentTheme: ColorTheme = "dark";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ColorTheme {
  return currentTheme;
}

function getServerSnapshot(): ColorTheme {
  return "dark";
}

function applyTheme(theme: ColorTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

function commitTheme(next: ColorTheme, persist: boolean) {
  currentTheme = next;
  applyTheme(next);
  if (persist) window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const next: ColorTheme = stored === "light" ? "light" : "dark";
    if (next === currentTheme) {
      applyTheme(next);
      return;
    }
    commitTheme(next, false);
  }, []);

  const setTheme = useCallback((next: ColorTheme) => {
    commitTheme(next, true);
  }, []);

  const toggleTheme = useCallback(() => {
    commitTheme(currentTheme === "dark" ? "light" : "dark", true);
  }, []);

  const palette = theme === "light" ? LIGHT_PALETTE : DARK_PALETTE;

  return (
    <ThemeContext.Provider value={{ theme, palette, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return value;
}
