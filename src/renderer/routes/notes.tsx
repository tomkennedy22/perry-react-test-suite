import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

function NotesPage() {
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

  function deleteNote(i: number) {
    save(notes.filter((_, idx) => idx !== i))
  }

  return (
    <div className="p-6 max-w-xl flex flex-col gap-4">
      <h1 className="text-[11px] uppercase tracking-widest text-subtext">Notes</h1>

      <div className="flex flex-col gap-2">
        <Textarea
          placeholder="Write a note… (⌘↵ to save)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && addNote()}
          rows={3}
        />
        <Button size="sm" onClick={addNote} disabled={isPending || !input.trim()} className="self-end">
          {isPending ? "Saving…" : "Save note"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {notes.length === 0 && (
          <p className="text-muted text-[12px]">No notes yet.</p>
        )}
        {notes.map((n, i) => (
          <div key={i} className="group flex items-start gap-3 px-3 py-2.5 bg-mantle rounded-lg border border-surface">
            <span className="flex-1 text-[13px] leading-relaxed whitespace-pre-wrap">{n}</span>
            <button
              onClick={() => deleteNote(i)}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-destructive transition-opacity text-[11px] shrink-0 mt-0.5 cursor-pointer bg-transparent border-0 p-0"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/notes")({ component: NotesPage })
