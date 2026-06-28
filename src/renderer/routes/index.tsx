import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api-client"

function SystemPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["system", "info"],
    queryFn: () => api.system.info.query(),
  })

  const rows = data
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

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-[11px] uppercase tracking-widest text-subtext mb-4">System</h1>
      {isLoading && <div className="text-muted text-sm">loading…</div>}
      <div className="rounded-lg border border-surface overflow-hidden">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex justify-between px-4 py-2.5 ${i < rows.length - 1 ? "border-b border-surface" : ""}`}
          >
            <span className="text-subtext text-[12px]">{k}</span>
            <span className="text-green text-[12px] tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/")({ component: SystemPage })
