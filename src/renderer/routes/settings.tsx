import { createFileRoute } from "@tanstack/react-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { api } from "@/api-client"
import { useTheme, type ThemeMode } from "@/hooks"
import { useModal } from "@/components/modal"
import { Button } from "@/components/ui/button"
import { Monitor, Sun, Moon, FolderOpen } from "lucide-react"

const THEMES: { value: ThemeMode; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light",  label: "Light",  icon: Sun },
  { value: "dark",   label: "Dark",   icon: Moon },
]

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-[11px] uppercase tracking-widest text-subtext">{title}</h2>
      {children}
    </div>
  )
}

function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const { open } = useModal()
  const qc = useQueryClient()

  const { data: systemInfo } = useQuery({
    queryKey: ["system", "info"],
    queryFn: () => api.system.info.query(),
  })

  const { mutate: openInFinder } = useMutation({
    mutationFn: (p: string) => api.shell.openPath.mutate(p),
    onError: () => toast.error("Could not open folder"),
  })

  const { mutate: clearNotes } = useMutation({
    mutationFn: () => api.notes.clearAll.mutate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] })
      toast.success("All notes deleted")
    },
    onError: () => toast.error("Failed to clear notes"),
  })

  return (
    <div className="p-6 max-w-lg flex flex-col gap-8">
      <h1 className="text-[11px] uppercase tracking-widest text-subtext">Settings</h1>

      <SettingsSection title="Appearance">
        <div className="flex gap-2">
          {THEMES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] transition-colors cursor-pointer
                ${theme === value
                  ? "border-blue text-blue bg-blue/10"
                  : "border-surface text-subtext hover:text-text hover:border-overlay"
                }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Data">
        <button
          onClick={() => systemInfo?.userData && openInFinder(systemInfo.userData)}
          disabled={!systemInfo?.userData}
          className="w-full text-left rounded-lg border border-surface px-4 py-3 flex items-center justify-between gap-3 hover:border-overlay hover:bg-surface/40 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-default"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[12px] text-text">Open app data folder in Finder</span>
            <span className="text-[11px] text-dim font-mono truncate">
              {systemInfo?.userData ?? "loading…"}
            </span>
          </div>
          <FolderOpen size={14} className="text-subtext shrink-0" />
        </button>

        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="destructive"
            className="self-start"
            onClick={() => open({
              title: "Delete all notes?",
              description: "This will permanently delete every note. This cannot be undone.",
              confirmLabel: "Delete all",
              onConfirm: () => clearNotes(),
            })}
          >
            Clear all notes
          </Button>
          <p className="text-[11px] text-dim">Permanently deletes every note from the database.</p>
        </div>
      </SettingsSection>
    </div>
  )
}

export const Route = createFileRoute("/settings")({ component: SettingsPage })
