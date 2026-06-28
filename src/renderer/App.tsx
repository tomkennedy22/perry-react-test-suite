import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "./api-client"
import { useSubscription } from "./hooks"

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
    <div className="space-y-0">
      {[
        ["Platform", `${data.platform} / ${data.arch}`],
        ["Hostname", data.hostname],
        ["CPU", data.cpuModel],
        ["Cores", String(data.cpus)],
        ["Memory", `${data.freeMemMB} / ${data.totalMemMB} MB free`],
        ["Uptime", `${Math.round(data.uptimeSec / 60)} min`],
        ["Release", data.release],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between py-[3px] border-b border-dashed border-overlay">
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
      <div className="text-[11px] text-muted break-all">
        <span
          className="hover:text-blue cursor-pointer"
          onClick={() => setDir("/")}
        >/ </span>
        {crumbs.map((seg, i) => {
          const path = "/" + crumbs.slice(0, i + 1).join("/")
          const isLast = i === crumbs.length - 1
          return (
            <span key={path}>
              <span
                className={isLast ? "text-text" : "hover:text-blue cursor-pointer opacity-60"}
                onClick={() => !isLast && setDir(path)}
              >{seg}</span>
              {!isLast && <span className="opacity-40"> / </span>}
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
            {!e.isDir && <span className="ml-auto text-muted tabular-nums text-[11px] shrink-0">{fmtBytes(e.sizeBytes)}</span>}
          </div>
        ))}
      </div>

      <h2 className="text-[11px] uppercase tracking-widest text-subtext mt-3 mb-1">File preview</h2>
      <pre className="bg-crust p-3 rounded-lg whitespace-pre-wrap break-words max-h-[280px] overflow-auto text-[12px] text-text">
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

  const { mutate: save } = useMutation({
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
      <textarea
        className="w-full min-h-[70px] bg-crust text-text border border-surface rounded-lg p-2 resize-y font-[inherit] text-[13px] focus:outline-none focus:border-blue"
        placeholder="Write a note, it persists to disk…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="self-start bg-blue text-crust font-semibold rounded-md px-3 py-1.5 cursor-pointer hover:brightness-110 text-[12px]"
        onClick={addNote}
      >
        Save note
      </button>
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
    <div className="flex flex-col h-full">
      <header className="w-full flex items-center justify-between px-[18px] py-3 bg-mantle border-b border-surface shrink-0">
        <div className="flex items-center gap-3">
          <img src="./image.png" className="h-7 rounded" alt="" />
          <h1 className="text-[15px] font-semibold m-0">
            Ground Control{" "}
            <span className="bg-surface px-[7px] py-[1px] rounded-full text-[10px] text-mauve">Perry × Electron</span>
          </h1>
        </div>
        <div className="text-blue text-[12px] tabular-nums">
          {clock ? new Date(clock).toLocaleTimeString() : "—"}
        </div>
      </header>

      <main className="flex-1 grid grid-cols-[320px_1fr] overflow-hidden">
        <section className="p-[18px] overflow-auto bg-mantle border-r border-surface flex flex-col gap-4">
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">System</h2>
            <SystemInfo />
          </div>
          <div>
            <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">Notes</h2>
            <Notes />
          </div>
        </section>

        <section className="p-[18px] overflow-auto">
          <h2 className="text-[11px] uppercase tracking-widest text-subtext mb-2">Files</h2>
          <FileExplorer />
        </section>
      </main>
    </div>
  )
}
