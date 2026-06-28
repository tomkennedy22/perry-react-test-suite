import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./api-client"
import { useSubscription } from "./hooks"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

function fmtBytes(n: number) {
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(1) + " MB"
}

function SystemInfo() {
  const { data, isLoading } = useQuery({
    queryKey: ["system", "info"],
    queryFn: () => api.system.info.query(),
  })
  if (isLoading || !data) return <div className="text-muted">loading…</div>
  return (
    <div>
      {[
        ["Platform", `${data.platform} / ${data.arch}`],
        ["Hostname", data.hostname],
        ["CPU", data.cpuModel],
        ["Cores", String(data.cpus)],
        ["Memory", `${data.freeMemMB} / ${data.totalMemMB} MB free`],
        ["Uptime", `${Math.round(data.uptimeSec / 60)} min`],
        ["Release", data.release],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between py-0.75 border-b border-dashed border-overlay">
          <span className="text-subtext">{k}</span>
          <span className="text-green tabular-nums">{v}</span>
        </div>
      ))}
    </div>
  )
}

function FileExplorer() {
  const [dir, setDir] = useState("")
  const [preview, setPreview] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["fs", "list", dir],
    queryFn: () => api.fs.list.query(dir),
  })

  const { data: fileData } = useQuery({
    queryKey: ["fs", "read", preview],
    queryFn: () => api.fs.read.query(preview!),
    enabled: preview !== null,
  })

  const crumbs = (data?.dir ?? "").split("/").filter(Boolean)

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] text-subtext break-all">
        <span className="hover:text-blue cursor-pointer" onClick={() => setDir("/")}>/ </span>
        {crumbs.map((seg, i) => {
          const path = "/" + crumbs.slice(0, i + 1).join("/")
          const isLast = i === crumbs.length - 1
          return (
            <span key={path}>
              <span
                className={isLast ? "text-text" : "hover:text-blue cursor-pointer opacity-75"}
                onClick={() => !isLast && setDir(path)}
              >{seg}</span>
              {!isLast && <span className="opacity-50"> / </span>}
            </span>
          )
        })}
      </div>

      <div>
        {isLoading && <div className="text-muted">loading…</div>}
        {data?.entries.map((e) => (
          <div
            key={e.name}
            className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-surface"
            onClick={() => {
              if (e.isDir) setDir(`${data.dir}/${e.name}`)
              else setPreview(`${data.dir}/${e.name}`)
            }}
          >
            <span className="w-4 text-center shrink-0">{e.isDir ? "📁" : "📄"}</span>
            <span className="truncate">{e.name}</span>
            {!e.isDir && (
              <Tooltip>
                <TooltipTrigger className="ml-auto text-muted tabular-nums text-[11px] shrink-0 bg-transparent border-0 p-0 cursor-default">
                  {fmtBytes(e.sizeBytes)}
                </TooltipTrigger>
                <TooltipContent>{e.sizeBytes.toLocaleString()} bytes</TooltipContent>
              </Tooltip>
            )}
          </div>
        ))}
      </div>

      <h2 className="text-[11px] uppercase tracking-widest text-subtext mt-3 mb-1">File preview</h2>
      <pre className="bg-crust p-3 rounded-lg whitespace-pre-wrap break-words max-h-70 overflow-auto text-[12px] text-text">
        {fileData
          ? fileData.ok ? fileData.text : `⚠️ ${fileData.error}`
          : "Click a file to preview its contents."}
      </pre>
    </div>
  )
}

function Notes() {
  const qc = useQueryClient()
  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.notes.load.query(),
  })
  const [input, setInput] = useState("")

  const { mutate: save, isPending } = useMutation({
    mutationFn: (next: string[]) => api.notes.save.mutate(next),
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["notes"] })
      qc.setQueryData(["notes"], next)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  })

  function addNote() {
    const v = input.trim()
    if (!v) return
    setInput("")
    save([v, ...notes])
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        placeholder="Write a note, it persists to disk…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.metaKey && addNote()}
      />
      <Button size="sm" onClick={addNote} disabled={isPending || !input.trim()}>
        {isPending ? "Saving…" : "Save note"}
      </Button>
      <div className="flex flex-col gap-1">
        {notes.map((n, i) => (
          <div key={i} className="px-2 py-1.5 bg-crust rounded-md text-[12px]">{n}</div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  const clock = useSubscription<string>((opts) => api.clock.tick.subscribe(opts))

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <header className="w-full flex items-center justify-between px-4.5 py-3 bg-mantle border-b border-surface shrink-0">
          <div className="flex items-center gap-3">
            <img src="./image.png" className="h-7 rounded" alt="" />
            <h1 className="text-[15px] font-semibold m-0 flex items-center gap-2">
              Ground Control
              <Badge variant="outline">Perry × Electron</Badge>
            </h1>
          </div>
          <Tooltip>
            <TooltipTrigger className="text-blue text-[12px] tabular-nums cursor-default bg-transparent border-0 p-0">
              {clock ? new Date(clock).toLocaleTimeString() : "—"}
            </TooltipTrigger>
            <TooltipContent>{clock ?? "waiting for clock…"}</TooltipContent>
          </Tooltip>
        </header>

        <main className="flex-1 grid grid-cols-[320px_1fr] overflow-hidden">
          <section className="p-4.5 overflow-auto bg-mantle border-r border-surface flex flex-col gap-4">
            <div>
              <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">System</h2>
              <SystemInfo />
            </div>
            <div>
              <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">Notes</h2>
              <Notes />
            </div>
          </section>

          <section className="p-4.5 overflow-auto">
            <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">Files</h2>
            <FileExplorer />
          </section>
        </main>
      </div>
    </TooltipProvider>
  )
}
