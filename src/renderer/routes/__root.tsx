import { createRootRoute, Outlet, Link, useNavigate } from "@tanstack/react-router"
import { useSubscription, useOnlineStatus, useTheme, useAppShortcuts, type ThemeMode } from "@/hooks"
import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Sun, Moon, Monitor, Settings } from "lucide-react"

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded text-[12px] text-subtext hover:text-text hover:bg-surface transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded text-[12px] bg-surface text-text" }}
    >
      {children}
    </Link>
  )
}

const CYCLE: ThemeMode[] = ["system", "light", "dark"]
const THEME_ICON = { system: Monitor, light: Sun, dark: Moon }
const THEME_LABEL = { system: "System", light: "Light", dark: "Dark" }

function RootLayout() {
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { mutate: closeWindow } = useMutation({ mutationFn: () => api.window.close.mutate() })
  useAppShortcuts({ onClose: closeWindow, onSettings: () => navigate({ to: "/settings" }) })
  const clock = useSubscription<string>((opts) => api.clock.tick.subscribe(opts))
  const online = useOnlineStatus()
  const ThemeIcon = THEME_ICON[theme]

  const { isSuccess: ready } = useQuery({
    queryKey: ["system", "info"],
    queryFn: () => api.system.info.query(),
  })

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        {!ready && (
          <div className="absolute inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-background">
            <img src="./perry-icon.svg" className="h-10 opacity-80" alt="Perry" />
            <div className="h-1 w-32 rounded-full bg-surface overflow-hidden">
              <div className="h-full bg-blue rounded-full animate-pulse w-full" />
            </div>
          </div>
        )}
        <header className="w-full flex items-center justify-between px-4 py-2.5 border-b border-surface shrink-0">
          <div className="flex items-center gap-3">
            <img src="./perry-icon.svg" className="h-6" alt="Perry" />
            <span className="text-[14px] font-semibold">Perry Desktop Test Suite</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/">System</NavLink>
            <NavLink to="/files">Files</NavLink>
            <NavLink to="/notes">Notes</NavLink>
            <NavLink to="/news">News</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger
                onClick={() => setTheme(CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length])}
                className="text-subtext hover:text-text transition-colors cursor-pointer bg-transparent border-0 p-0"
                aria-label={`Theme: ${THEME_LABEL[theme]}`}
              >
                <ThemeIcon size={14} />
              </TooltipTrigger>
              <TooltipContent>{THEME_LABEL[theme]}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger className="text-blue text-[12px] tabular-nums cursor-default bg-transparent border-0 p-0">
                {clock ? new Date(clock).toLocaleTimeString() : "—"}
              </TooltipTrigger>
              <TooltipContent>{clock ?? "waiting for clock…"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger className="bg-transparent border-0 p-0">
                <Link
                  to="/settings"
                  className="text-subtext hover:text-text transition-colors flex items-center"
                  aria-label="Settings"
                >
                  <Settings size={14} />
                </Link>
              </TooltipTrigger>
              <TooltipContent>Settings (⌘,)</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {!online && (
          <div className="shrink-0 flex items-center justify-center gap-2 bg-surface px-4 py-1.5 text-[11px] text-subtext">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive inline-block" />
            No internet connection — some features may be unavailable
          </div>
        )}

        <main className="flex-1 overflow-y-scroll overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })
