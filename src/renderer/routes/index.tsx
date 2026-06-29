import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/api-client"
import { Button } from "@/components/ui/button"
import { useModal } from "@/components/modal"

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
  const { open } = useModal()
  const [benchResult, setBenchResult] = useState<{ n: number; singleMs: number; parallelMs: number; speedup: number; workers: number } | null>(null)
  const { mutate: runBenchmark, isPending: benchRunning } = useMutation({
    mutationFn: () => api.threads.benchmark.mutate(),
    onSuccess: (r) => setBenchResult(r),
    onError: () => toast.error("Benchmark failed — @perryts/threads may not compile under Perry AOT"),
  })
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
        ["App name", fmt(data.appName)],
        ["App version", fmt(data.appVersion)],
        ["App locale", fmt(data.appLocale)],
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
        ["nativeTheme dark",  fmt(win.nativeThemeDark)],
        ["nativeTheme source",fmt(win.nativeThemeSource)],
      ]
    : []

  return (
    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
      <div>
        <h1 className="text-[11px] uppercase tracking-widest text-subtext mb-4">System</h1>
        {isLoading && <div className="text-dim text-sm">loading…</div>}
        {systemRows.length > 0 && <InfoTable rows={systemRows} />}
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Window</h2>
        {windowRows.length > 0 && <InfoTable rows={windowRows} />}
      </div>

      {/* Clipboard — revisit backend: clipboard not in electron-compat shim (linker error) */}
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Clipboard</h2>
        <Button
          size="sm"
          onClick={() =>
            navigator.clipboard.writeText("clipboard test from Perry Desktop Test Suite")
              .then(() => console.log("[clipboard] write ok"))
              .catch((e) => console.error("[clipboard] write failed", e))
          }
        >
          Copy test string
        </Button>
      </div>

      {/* Notifications — revisit: Electron Notification not in shim, window.Notification auto-denied */}
      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Notifications</h2>
        <Button
          size="sm"
          onClick={() => {
            Notification.requestPermission().then((p) => {
              console.log("[notif] permission:", p)
              if (p === "granted") {
                new Notification("Perry Desktop Test Suite", { body: "Renderer notification test" })
              }
            })
          }}
        >
          Send test notification
        </Button>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Perry Threads</h2>
        <div className="flex flex-col gap-3">
          <Button size="sm" onClick={() => runBenchmark()} disabled={benchRunning}>
            {benchRunning ? "Running…" : "Run benchmark (500k items)"}
          </Button>
          {benchResult && (
            <InfoTable rows={[
              ["Items",           benchResult.n.toLocaleString()],
              ["Workers",         String(benchResult.workers)],
              ["Single-threaded", `${benchResult.singleMs}ms`],
              ["parallelMap",     `${benchResult.parallelMs}ms`],
              ["Speedup",         `${benchResult.speedup}×`],
            ]} />
          )}
        </div>
      </div>

      <div>
        <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-4">Modal</h2>
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => open({
              title: "Confirm action",
              description: "This is a confirm dialog. Press Confirm to fire a toast.",
              confirmLabel: "Confirm",
              onConfirm: () => toast.success("Confirmed!"),
            })}
          >
            Open confirm dialog
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => open({
              title: "Info",
              description: "This modal has no confirm action — just a close button.",
            })}
          >
            Open info dialog
          </Button>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: SystemPage })
