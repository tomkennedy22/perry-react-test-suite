import { createRootRoute, Outlet, Link } from "@tanstack/react-router"
import { useSubscription, useOnlineStatus, useSystemTheme, useAppShortcuts } from "@/hooks"
import { useMutation } from "@tanstack/react-query"
import { api } from "@/api-client"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

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

function RootLayout() {
  useSystemTheme()
  const { mutate: closeWindow } = useMutation({ mutationFn: () => api.window.close.mutate() })
  useAppShortcuts({ onClose: closeWindow })
  const clock = useSubscription<string>((opts) => api.clock.tick.subscribe(opts))
  const online = useOnlineStatus()

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
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

          <Tooltip>
            <TooltipTrigger className="text-blue text-[12px] tabular-nums cursor-default bg-transparent border-0 p-0">
              {clock ? new Date(clock).toLocaleTimeString() : "—"}
            </TooltipTrigger>
            <TooltipContent>{clock ?? "waiting for clock…"}</TooltipContent>
          </Tooltip>
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
