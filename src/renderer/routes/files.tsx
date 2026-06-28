import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

function fmtBytes(n: number) {
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(1) + " MB"
}

function FilesPage() {
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
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 flex flex-col border-r border-surface overflow-hidden">
        <div className="px-3 py-2 border-b border-surface">
          <div className="text-[11px] text-subtext break-all leading-relaxed">
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
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading && <div className="text-muted text-[12px] p-3">loading…</div>}
          {data?.entries.map((e) => (
            <div
              key={e.name}
              className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-surface transition-colors ${
                preview === `${data.dir}/${e.name}` ? "bg-surface" : ""
              }`}
              onClick={() => {
                if (e.isDir) { setDir(`${data.dir}/${e.name}`); setPreview(null) }
                else setPreview(`${data.dir}/${e.name}`)
              }}
            >
              <span className="text-[13px] shrink-0">{e.isDir ? "📁" : "📄"}</span>
              <span className="truncate text-[12px]">{e.name}</span>
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
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 py-2 border-b border-surface shrink-0">
          <span className="text-[11px] uppercase tracking-widest text-subtext">
            {preview ? preview.split("/").pop() : "Preview"}
          </span>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-[12px] text-text whitespace-pre-wrap break-words leading-relaxed">
          {fileData
            ? fileData.ok ? fileData.text : `⚠️ ${fileData.error}`
            : <span className="text-muted">Select a file to preview its contents.</span>}
        </pre>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/files")({ component: FilesPage })
