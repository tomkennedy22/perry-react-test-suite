import { useState, useRef } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/api-client"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { FolderOpen } from "lucide-react"

function fmtBytes(n: number) {
  if (n < 1024) return n + " B"
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB"
  return (n / (1024 * 1024)).toFixed(1) + " MB"
}

function FilesPage() {
  const [dir, setDir] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  const { data, isLoading } = useQuery({
    queryKey: ["fs", "list", dir],
    queryFn: () => api.fs.list.query(dir),
  })

  const { data: fileData, isFetching: previewLoading } = useQuery({
    queryKey: ["fs", "read", preview],
    queryFn: () => api.fs.read.query(preview!),
    enabled: preview !== null,
  })

  // dialog.showOpenDialog is a Perry v1 stub — always returns canceled for now.
  // When Perry implements it, this will work without any changes needed here.
  const { mutate: pickFile } = useMutation({
    mutationFn: () => api.fs.pick.mutate({}),
    onSuccess: (result) => {
      if (result.canceled) {
        toast.info("File picker not yet supported by Perry — drag a file in instead")
        return
      }
      setPreview(result.path)
      setDir(result.path.split("/").slice(0, -1).join("/"))
    },
  })

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    dragCounter.current = 0

    const file = e.dataTransfer.files[0]
    if (!file) return

    // Electron WebView adds .path with the full filesystem path
    const nativePath = (file as any).path as string | undefined
    if (nativePath) {
      setPreview(nativePath)
      const parent = nativePath.split("/").slice(0, -1).join("/")
      setDir(parent)
      return
    }

    // Browser dev fallback: read via FileReader
    const reader = new FileReader()
    reader.onload = () => {
      const text = reader.result as string
      setPreview(`__dropped__${file.name}`)
      // Stash content for display — inject via a custom approach
      sessionStorage.setItem("__dropped_content__", text.slice(0, 20000))
      sessionStorage.setItem("__dropped_name__", file.name)
    }
    reader.readAsText(file)
  }

  const droppedContent = preview?.startsWith("__dropped__")
    ? sessionStorage.getItem("__dropped_content__")
    : null
  const droppedName = preview?.startsWith("__dropped__")
    ? sessionStorage.getItem("__dropped_name__")
    : null

  const crumbs = (data?.dir ?? "").split("/").filter(Boolean)

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-72 shrink-0 flex flex-col border-r border-surface overflow-hidden">
        <div className="px-3 py-2 border-b border-surface flex items-center gap-2">
          <div className="flex-1 text-[11px] text-subtext break-all leading-relaxed">
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
          <div className="flex gap-1 shrink-0">
            <Tooltip>
              <TooltipTrigger className="bg-transparent border-0 p-0">
                <Button size="icon-sm" variant="ghost" onClick={() => pickFile()}>
                  <FolderOpen size={13} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open file…</TooltipContent>
            </Tooltip>
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

        <div className="px-3 py-2 border-t border-surface">
          <Button size="xs" variant="ghost" className="w-full text-subtext" onClick={() => pickFile()}>
            Open file…
          </Button>
        </div>
      </div>

      <div
        className={`flex-1 flex flex-col overflow-hidden transition-colors ${isDragging ? "bg-blue/5 ring-1 ring-inset ring-blue/30" : ""}`}
        onDragEnter={(e) => { e.preventDefault(); dragCounter.current++; setIsDragging(true) }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => { dragCounter.current--; if (dragCounter.current === 0) setIsDragging(false) }}
        onDrop={handleDrop}
      >
        <div className="px-4 py-2 border-b border-surface shrink-0 flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-widest text-subtext">
            {droppedName ?? (preview ? preview.split("/").pop() : "Preview")}
          </span>
          {isDragging && (
            <span className="text-[11px] text-blue">Drop to preview</span>
          )}
        </div>

        {!preview && !isDragging && (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-dim">
            <p className="text-[12px]">Select a file or drag one in from Finder</p>
            <p className="text-[11px]">Or use the folder icon to open a file picker</p>
          </div>
        )}

        {previewLoading && (
          <div className="flex-1 flex items-center justify-center text-dim text-[12px]">loading…</div>
        )}

        {!previewLoading && (preview || droppedContent) && (
          <pre className="flex-1 overflow-auto p-4 text-[12px] text-text whitespace-pre-wrap break-words leading-relaxed">
            {droppedContent
              ? droppedContent
              : fileData
                ? fileData.ok ? fileData.text : `⚠️ ${fileData.error}`
                : null}
          </pre>
        )}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/files")({ component: FilesPage })
