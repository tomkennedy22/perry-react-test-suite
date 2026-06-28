import { useState, useEffect } from "react"

export function useSubscription<T>(
  subscribe: (opts: { onData: (d: T) => void }) => () => void
) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => subscribe({ onData: setData }), [])
  return data
}
