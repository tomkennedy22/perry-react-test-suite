import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function NotesPage() {
  const qc = useQueryClient()
  const [input, setInput] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBody, setEditBody] = useState("")

  const { data: notes = [] } = useQuery({
    queryKey: ["notes"],
    queryFn: () => api.notes.list.query(),
  })

  const { mutate: create, isPending: creating } = useMutation({
    mutationFn: (body: string) => api.notes.create.mutate(body),
    onSuccess: () => {
      setInput("")
      qc.invalidateQueries({ queryKey: ["notes"] })
    },
  })

  const { mutate: update } = useMutation({
    mutationFn: (input: { id: number; body: string }) => api.notes.update.mutate(input),
    onSuccess: () => { setEditingId(null); qc.invalidateQueries({ queryKey: ["notes"] }) },
  })

  const { mutate: remove } = useMutation({
    mutationFn: (id: number) => api.notes.delete.mutate(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["notes"] })
      qc.setQueryData(["notes"], (old: typeof notes) => old.filter((n) => n.id !== id))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  })

  function startEdit(note: (typeof notes)[number]) {
    setEditingId(note.id)
    setEditBody(note.body)
  }

  return (
    <div className="p-6 max-w-xl flex flex-col gap-4">
      <h1 className="text-[11px] uppercase tracking-widest text-subtext">Notes</h1>

      <div className="flex flex-col gap-2 border rounded-lg border-surface">
        <Textarea
          placeholder="Write a note… (⌘↵ to save)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.metaKey && input.trim() && create(input.trim())}
          rows={3}
          className="border-b"
        />
        <Button
          size="sm"
          onClick={() => input.trim() && create(input.trim())}
          disabled={creating || !input.trim()}
          className="self-end"
        >
          {creating ? "Saving…" : "Add note"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {notes.length === 0 && (
          <p className="text-dim text-[12px]">No notes yet.</p>
        )}
        {notes.map((note) => (
          <div
            key={note.id ?? note.createdAt}
            className="group flex flex-col gap-2 px-3 py-2.5 rounded-lg border border-surface"
          >
            {editingId !== null && editingId === note.id ? (
              <div className="flex flex-col gap-2">
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.metaKey && update({ id: note.id, body: editBody })}
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="xs" onClick={() => update({ id: note.id, body: editBody })}>Save</Button>
                  <Button size="xs" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <span className="text-[13px] text-text leading-relaxed whitespace-pre-wrap">{note.body}</span>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-dim">{timeAgo(note.createdAt)}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(note)}
                      className="text-dim hover:text-subtext text-[11px] cursor-pointer bg-transparent border-0 p-0 px-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(note.id)}
                      className="text-dim hover:text-destructive text-[11px] cursor-pointer bg-transparent border-0 p-0 px-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute("/notes")({ component: NotesPage })
