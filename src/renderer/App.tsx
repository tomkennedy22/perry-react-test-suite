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
  if (isLoading || !data) return <div>loading…</div>
  return (
    <>
      {[
        ["Platform", `${data.platform} / ${data.arch}`],
        ["Hostname", data.hostname],
        ["CPU", data.cpuModel],
        ["Cores", String(data.cpus)],
        ["Memory", `${data.freeMemMB} / ${data.totalMemMB} MB free`],
        ["Uptime", `${Math.round(data.uptimeSec / 60)} min`],
        ["Release", data.release],
      ].map(([k, v]) => (
        <div key={k} className="kv">
          <span>{k}</span>
          <span>{v}</span>
        </div>
      ))}
    </>
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
    <>
      <div className="crumbs">
        <span className="crumb" onClick={() => setDir("/")}>/ </span>
        {crumbs.map((seg, i) => {
          const path = "/" + crumbs.slice(0, i + 1).join("/")
          const isLast = i === crumbs.length - 1
          return (
            <span key={path}>
              <span
                className="crumb"
                style={{ opacity: isLast ? 1 : 0.6, cursor: isLast ? "default" : "pointer" }}
                onClick={() => !isLast && setDir(path)}
              >{seg}</span>
              {!isLast && <span style={{ opacity: 0.4 }}> / </span>}
            </span>
          )
        })}
      </div>
      <div id="files">
        {isLoading && <div>loading…</div>}
        {data?.entries.map((e) => (
          <div
            key={e.name}
            className="file"
            onClick={() => {
              if (e.isDir) setDir(`${data.dir}/${e.name}`)
              else setPreview(`${data.dir}/${e.name}`)
            }}
          >
            <span className="ic">{e.isDir ? "📁" : "📄"}</span>
            <span>{e.name}</span>
            {!e.isDir && <span className="sz">{fmtBytes(e.sizeBytes)}</span>}
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 22 }}>File preview</h2>
      <pre id="preview">
        {fileData
          ? fileData.ok ? fileData.text : `⚠️ ${fileData.error}`
          : "Click a file to preview its contents."}
      </pre>
    </>
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
    <div className="notes">
      <textarea
        id="noteInput"
        placeholder="Write a note, it persists to disk…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={addNote}>Save note</button>
      <div id="noteList">
        {notes.map((n, i) => (
          <div key={i} className="note">{n}</div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  const clock = useSubscription<string>((opts) => api.clock.tick.subscribe(opts))

  return (
    <>
      <header>
        <img src="./image.png" style={{ height: 28, borderRadius: 4 }} alt="" />
        <h1>Ground Control <span className="badge">Perry × Electron</span></h1>
        <div id="clock">{clock ? new Date(clock).toLocaleTimeString() : "—"}</div>
      </header>
      <main>
        <section className="panel left">
          <h2>System</h2>
          <SystemInfo />
          <h2 style={{ marginTop: 22 }}>Notes</h2>
          <Notes />
        </section>
        <section className="panel right">
          <h2>Home directory</h2>
          <FileExplorer />
        </section>
      </main>
    </>
  )
}
