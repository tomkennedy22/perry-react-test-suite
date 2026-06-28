import { createRootRoute, Outlet, Link } from "@tanstack/react-router"
import { useSubscription } from "@/hooks"
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
  const clock = useSubscription<string>((opts) => api.clock.tick.subscribe(opts))

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full">
        <header className="w-full flex items-center justify-between px-4 py-2.5 bg-mantle border-b border-surface shrink-0">
          <div className="flex items-center gap-3">
            <img src="./image.png" className="h-6 rounded" alt="" />
            <span className="text-[14px] font-semibold">Ground Control</span>
          </div>

          <nav className="flex items-center gap-1">
            <NavLink to="/">System</NavLink>
            <NavLink to="/files">Files</NavLink>
            <NavLink to="/notes">Notes</NavLink>
          </nav>

          <Tooltip>
            <TooltipTrigger className="text-blue text-[12px] tabular-nums cursor-default bg-transparent border-0 p-0">
              {clock ? new Date(clock).toLocaleTimeString() : "—"}
            </TooltipTrigger>
            <TooltipContent>{clock ?? "waiting for clock…"}</TooltipContent>
          </Tooltip>
        </header>

        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}

export const Route = createRootRoute({ component: RootLayout })
