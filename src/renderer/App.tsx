import { useState } from "react"
import { api } from "./api-client"
import { useQuery, useSubscription } from "./hooks"

function fmtBytes(n: number) {
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(1) + " MB"
}

function SystemInfo() {
  const { data } = useQuery(() => api.system.info.query())
  if (!data) return <div>loading…</div>
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
  const { data } = useQuery(() => api.fs.list.query(""))
  const [preview, setPreview] = useState<string | null>(null)

  async function openFile(name: string) {
    if (!data) return
    const res = await api.fs.read.query(`${data.dir}/${name}`)
    setPreview(res.ok ? res.text : `⚠️ ${res.error}`)
  }

  return (
    <>
      <div className="crumbs">{data?.dir}</div>
      <div id="files">
        {data?.entries.map((e) => (
          <div key={e.name} className="file" onClick={() => !e.isDir && openFile(e.name)}>
            <span className="ic">{e.isDir ? "📁" : "📄"}</span>
            <span>{e.name}</span>
            {!e.isDir && <span className="sz">{fmtBytes(e.sizeBytes)}</span>}
          </div>
        ))}
      </div>
      <h2 style={{ marginTop: 22 }}>File preview</h2>
      <pre id="preview">{preview ?? "Click a file to preview its contents."}</pre>
    </>
  )
}

function Notes() {
  const { data: initial } = useQuery(() => api.notes.load.query())
  const [notes, setNotes] = useState<string[]>([])
  const [input, setInput] = useState("")

  // Sync fetched notes into state once loaded
  if (initial && notes.length === 0 && initial.length > 0) setNotes(initial)

  async function save() {
    const v = input.trim()
    if (!v) return
    const next = [v, ...notes]
    setNotes(next)
    setInput("")
    await api.notes.save.mutate(next)
  }

  return (
    <div className="notes">
      <textarea
        id="noteInput"
        placeholder="Write a note, it persists to disk…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button onClick={save}>Save note</button>
      <div id="noteList">
        {notes.map((n, i) => (
          <div key={i} className="note">{n}</div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  const clock = useSubscription((opts) => api.clock.tick.subscribe(opts))

  return (
    <>
      <header>
        <img src="./image.png" style={{ height: 28, borderRadius: 4 }} alt="" />
        <h1>System Explorer <span className="badge">Perry × Electron</span></h1>
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
