import { api } from "./api-client"

function fmtBytes(n: number): string {
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(1) + " MB"
}

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T
}

// ---- System info ----

async function loadSystem() {
  const info = await api.system.info.query()
  el("sysinfo").innerHTML = [
    ["Platform", `${info.platform} / ${info.arch}`],
    ["Hostname", info.hostname],
    ["CPU", info.cpuModel],
    ["Cores", String(info.cpus)],
    ["Memory", `${info.freeMemMB} / ${info.totalMemMB} MB free`],
    ["Uptime", `${Math.round(info.uptimeSec / 60)} min`],
    ["Release", info.release],
  ]
    .map(([k, v]) => `<div class="kv"><span>${k}</span><span>${v}</span></div>`)
    .join("")
}

// ---- File listing + preview ----

let lastDir = ""

async function loadFiles() {
  const res = await api.fs.list.query("")
  lastDir = res.dir
  el("crumbs").textContent = res.dir
  const filesEl = el("files")
  filesEl.innerHTML = res.entries
    .map((e) => {
      const ic = e.isDir ? "📁" : "📄"
      const sz = e.isDir ? "" : `<span class="sz">${fmtBytes(e.sizeBytes)}</span>`
      return `<div class="file" data-name="${e.name}" data-dir="${e.isDir ? "1" : "0"}">
        <span class="ic">${ic}</span><span>${e.name}</span>${sz}
      </div>`
    })
    .join("")
  filesEl.querySelectorAll<HTMLElement>(".file").forEach((el) => {
    el.addEventListener("click", async () => {
      if (el.dataset.dir === "1") return
      const res = await api.fs.read.query(`${lastDir}/${el.dataset.name}`)
      const pre = document.getElementById("preview")!
      pre.textContent = res.ok ? res.text : `⚠️ ${res.error}`
    })
  })
}

// ---- Notes ----

let notes: string[] = []

async function loadNotes() {
  notes = await api.notes.load.query()
  renderNotes()
}

function renderNotes() {
  el("noteList").innerHTML = notes
    .map((n) => `<div class="note">${escapeHtml(n)}</div>`)
    .join("")
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"))
}

el("addNote").addEventListener("click", async () => {
  const input = el<HTMLTextAreaElement>("noteInput")
  const v = input.value.trim()
  if (!v) return
  notes.unshift(v)
  input.value = ""
  renderNotes()
  await api.notes.save.mutate(notes)
})

// ---- Live clock (subscription) ----

api.clock.tick.subscribe({
  onData: (iso) => {
    el("clock").textContent = new Date(iso).toLocaleTimeString()
  },
})

// ---- Init ----

loadSystem()
loadFiles()
loadNotes()
