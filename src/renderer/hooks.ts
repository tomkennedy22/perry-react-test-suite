import { useState, useEffect } from "react"

export function useSystemTheme() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = (dark: boolean) =>
      document.documentElement.classList.toggle("dark", dark)
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])
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
