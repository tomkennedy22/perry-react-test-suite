import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

function timeAgo(unixSec: number) {
  const s = Math.floor(Date.now() / 1000 - unixSec)
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function NewsPage() {
  const { mutate: openExternal } = useMutation({
    mutationFn: (url: string) => api.shell.openExternal.mutate(url),
  })

  function openUrl(url: string) {
    if (window.__PERRY_IPC__) openExternal(url)
    else window.open(url, "_blank")
  }

  const { data: stories = [], isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["news", "top"],
    queryFn: () => api.news.top.query(),
    staleTime: 5 * 60_000,
  })

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-3 border-b border-surface shrink-0">
        <h1 className="text-[11px] uppercase tracking-widest text-subtext">Hacker News — Top Stories</h1>
        <Button size="xs" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-surface animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="m-6 text-destructive text-[12px] bg-destructive/10 px-4 py-3 rounded-lg">
            {String(error)}
          </div>
        )}

        {!isLoading && !error && (
          <div className="divide-y divide-surface">
            {stories.map((story, i) => (
              <div
                key={story.id}
                className="flex items-start gap-3 px-6 py-3 transition-colors cursor-pointer group"
                onClick={() => story.url && openUrl(story.url)}
              >
                <span className="text-[12px] text-muted tabular-nums w-6 shrink-0 pt-0.5 text-right">
                  {i + 1}
                </span>
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <span className="text-[13px] leading-snug group-hover:text-blue transition-colors">
                    {story.title}
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {story.domain && (
                      <span className="text-[11px] text-muted">{story.domain}</span>
                    )}
                    <span className="text-[11px] text-subtext">▲ {story.score}</span>
                    <span className="text-[11px] text-muted">{story.comments} comments</span>
                    <span className="text-[11px] text-muted">by {story.by}</span>
                    <span className="text-[11px] text-muted">{timeAgo(story.time)}</span>
                  </div>
                </div>
                {!story.url && (
                  <Badge variant="secondary" className="text-[10px] h-4 shrink-0">Ask HN</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/news")({ component: NewsPage })
