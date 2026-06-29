import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react"
import { api } from "@/api-client"

export function useAppShortcuts({ onClose, onSettings }: { onClose: () => void; onSettings: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return
      if (e.key === "r") { e.preventDefault(); window.location.reload() }
      if (e.key === "[") { e.preventDefault(); if (window.history.length > 1) window.history.back() }
      if (e.key === "]") { e.preventDefault(); window.history.forward() }
      if (e.key === "w") { e.preventDefault(); onClose() }
      if (e.key === ",") { e.preventDefault(); onSettings() }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onClose, onSettings])
}

export type ThemeMode = "system" | "light" | "dark"
const THEME_KEY = "perry-theme"

function applyTheme(mode: ThemeMode) {
  const dark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
}

type ThemeContextValue = { theme: ThemeMode; setTheme: (t: ThemeMode) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem(THEME_KEY) as ThemeMode) ?? "system"
  )

  useEffect(() => {
    api.settings.get.query().then((s) => {
      if (s.theme && s.theme !== (localStorage.getItem(THEME_KEY) as ThemeMode)) {
        localStorage.setItem(THEME_KEY, s.theme)
        setThemeState(s.theme)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => applyTheme("system")
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [theme])

  const setTheme = useCallback((t: ThemeMode) => {
    localStorage.setItem(THEME_KEY, t)
    setThemeState(t)
    api.settings.set.mutate({ theme: t }).catch(() => {})
  }, [])

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider")
  return ctx
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    // Native window doesn't reliably fire online/offline events — poll as fallback
    const timer = setInterval(update, 3000)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      clearInterval(timer)
    }
  }, [])
  return online
}

export function useSubscription<T>(
  subscribe: (opts: { onData: (d: T) => void }) => () => void
) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => subscribe({ onData: setData }), [])
  return data
}
