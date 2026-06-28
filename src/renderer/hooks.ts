import { useState, useEffect } from "react"

export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(true)
    fn().then((d) => { setData(d); setLoading(false) })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return { data, loading }
}

export function useSubscription<T>(
  subscribe: (opts: { onData: (d: T) => void }) => () => void
) {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => subscribe({ onData: setData }), [])
  return data
}
