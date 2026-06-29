import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api-client"

function InfoTable({ rows }: { rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-surface overflow-hidden">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={`flex justify-between px-4 py-2.5 ${i < rows.length - 1 ? "border-b border-surface" : ""}`}
        >
          <span className="text-subtext text-[12px]">{k}</span>
          <span className={`text-[12px] tabular-nums ${v === "n/a" ? "text-dim" : "text-green"}`}>{v}</span>
        </div>
      ))}
    </div>
  )
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return "n/a"
  if (Array.isArray(v)) return v.join(" × ")
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function SystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["system", "info"],
    queryFn: () => api.system.info.query(),
  })

  const { data: win } = useQuery({
    queryKey: ["window", "info"],
    queryFn: () => api.window.info.query(),
    refetchInterval: 2000,
  })

  const systemRows: [string, string][] = data
    ? [
        ["Platform", `${data.platform} / ${data.arch}`],
        ["Hostname", data.hostname],
        ["CPU", data.cpuModel],
        ["Cores", String(data.cpus)],
        ["Memory", `${data.freeMemMB} / ${data.totalMemMB} MB free`],
        ["Uptime", `${Math.round(data.uptimeSec / 60)} min`],
        ["Release", data.release],
      ]
    : []

  const windowRows: [string, string][] = win
    ? [
        ["Window available",  fmt(win.available)],
        ["Open windows",      fmt(win.openCount)],
        ["Focused",           fmt(win.focusedTitle)],
        ["Is destroyed",      fmt(win.isDestroyed)],
        ["Bounds (x/y/w/h)", fmt(win.bounds)],
        ["Size",              fmt(win.size)],
        ["Position",          fmt(win.position)],
        ["Content size",      fmt(win.contentSize)],
        ["Is maximized",      fmt(win.isMaximized)],
        ["Is minimized",      fmt(win.isMinimized)],
        ["Is fullscreen",     fmt(win.isFullScreen)],
        ["Is focused",        fmt(win.isFocused)],
        ["Is visible",        fmt(win.isVisible)],
        ["Title",             fmt(win.title)],
        ["Is resizable",      fmt(win.isResizable)],
        ["Is movable",        fmt(win.isMovable)],
        ["Opacity",           fmt(win.opacity)],
      ]
    : []

  return (
    <div className="p-6 max-w-lg flex flex-col gap-6">
      <div>
        <h1 className="text-[11px] uppercase tracking-widest text-subtext mb-4">System</h1>
        {isLoading && <div className="text-dim text-sm">loading…</div>}
        {systemRows.length > 0 && <InfoTable rows={systemRows} />}
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Window</h2>
        {windowRows.length > 0 && <InfoTable rows={windowRows} />}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: SystemPage })
