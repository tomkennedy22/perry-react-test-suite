# Ground Control — Kitchen Sink TODO

## What this is

**Ground Control** — a developer dashboard desktop app, open-source reference
for the Perry + Electron-compat stack. Shows GitHub PRs needing review, CI
status, running local services/ports, a quick-note scratchpad, and live system
stats. Tray-first so it's always one click away.

Every feature earns its place:
- GitHub API → REST fetch example + keychain for token
- CI status → WebSocket / live polling
- Local services → file watcher + system info
- Notes → SQLite CRUD
- Tray → always-on, global shortcut to surface
- Deep linking → `groundcontrol://pr/123` opens from Slack/notifications
- Notifications → "PR approved", "CI failed"

## What's already working (scaffold)

- Perry + Electron-compat compiles TypeScript to a native binary
- BrowserWindow loads a Vite-built React renderer from `renderer/dist/index.html`
- Dual transport: IPC in native window (`__PERRY_IPC__`), HTTP+SSE in browser dev
- Custom tRPC-style typed router with query/mutation/subscription
- `src/api.ts` — procedures for system info, file system, notes, clock tick
- `src/router.ts` — mountRouter (IPC handlers + HTTP dev server on :3131)
- `src/main.ts` — Electron entry, BrowserWindow lifecycle
- `src/preload.js` — contextBridge exposes `__PERRY_IPC__`
- `src/renderer/api-client.ts` — Proxy-based typed client (auto-detects IPC vs HTTP)
- `src/renderer/App.tsx` — React UI with SystemInfo, FileExplorer, Notes, clock
- `src/renderer/hooks.ts` — lightweight useQuery / useSubscription
- Vite + vite-plugin-singlefile → single inlined HTML in `renderer/dist/`

## How to run

**Dev (browser mode):**
```
PERRY_DEV=1 ./system-explorer   # backend HTTP server on :3131
npx vite                        # renderer on :5173, open in browser
```

**Native (compiled):**
```
npx vite build && /tmp/perry-electron-compat/target/release/perry compile src/main.ts -o system-explorer
./system-explorer
```

**Perry must be built from source** — `feat/electron-compat` branch is not on npm.
Clone https://github.com/PerryTS/perry, checkout `feat/electron-compat`, run
`cargo build --release` then `cargo build --release -p perry-ui-macos`.
Install the electron package from local clone: `file:///path/to/perry/packages/electron`.

## Open questions / risks

- **tRPC compat**: @trpc/server uses Node APIs — needs testing under perry's
  module system before committing to the migration.
- **SQLite**: better-sqlite3 is a native .node addon, perry may not support it.
  Fallback: sql.js (pure JS WASM) or @sqlite.org/sqlite-wasm.
- **perry compile entrypoint**: `__dirname` resolves relative to source file,
  so with entry at `src/backend/index.ts`, `__dirname` is `src/backend/` and
  renderer path must be `path.join(__dirname, "..", "renderer", "dist", "index.html")`.

## Perry constraints (discovered)

- **npm packages need `perry.compilePackages` opt-in**: Perry removed V8, so
  it can't run pre-compiled JS at runtime. Any npm package used in `src/backend/`
  must be added to both `perry.compilePackages` and `perry.allow.compilePackages`
  in package.json. Perry then compiles those packages natively at build time.
  Format: `"perry": { "compilePackages": ["zod"], "allow": { "compilePackages": ["zod"] } }`.

- **Zod v3 works, Zod v4 does not**: Zod v4 compiles but crashes at runtime with
  `Cannot read properties of undefined (reading 'run')`. Zod v4 restructured its
  parse pipeline around `_zod.run()` and something in that class initialization
  doesn't survive Perry's AOT compilation. Zod v3 works correctly. Worth filing
  with the Perry maintainer as a Zod v4 incompatibility bug.

- **Zod v3 `.default()` only fires for `undefined`, not `""`**: When the renderer
  sends an empty string input, use `z.string().optional().parse(x) || fallback`
  rather than `z.string().default(fallback).parse(x)`.

- **tRPC server in backend**: Unknown — not yet tested. @trpc/server would also
  need `perry.compilePackages`. May work (like Zod) or may have similar runtime
  issues. Worth trying when we get to Phase 2.

---

# Kitchen Sink TODO

## Proposed file structure

```
src/
├── backend/                   ← Perry native process (compiled to binary)
│   ├── index.ts               ← entry point: app, BrowserWindow lifecycle
│   ├── preload.ts             ← contextBridge — exposes __PERRY_IPC__
│   ├── router/
│   │   ├── index.ts           ← assembled tRPC router (AppRouter export)
│   │   ├── system.ts          ← os info procedures
│   │   ├── fs.ts              ← file system procedures
│   │   ├── notes.ts           ← notes CRUD (SQLite)
│   │   ├── github.ts          ← GitHub API procedures (PRs, CI status)
│   │   └── stream.ts          ← WebSocket / live data example
│   ├── db/
│   │   ├── client.ts          ← SQLite connection singleton
│   │   └── migrations/        ← schema migration files
│   ├── services/
│   │   ├── logger.ts          ← file logger (shared with main process)
│   │   ├── keychain.ts        ← OS credential vault
│   │   └── window-state.ts    ← remember size/position across launches
│   └── transport/
│       ├── ipc.ts             ← mountRouter for IPC (prod)
│       └── http.ts            ← mountRouter for HTTP+SSE (dev)
├── shared/                    ← imported by BOTH sides
│   ├── schemas.ts             ← Zod schemas (single source of truth)
│   └── types.ts               ← derived TypeScript types (from schemas)
└── renderer/                  ← Vite/React (browser + webview)
    ├── main.tsx               ← createRoot + TanStack Router provider
    ├── api/
    │   ├── client.ts          ← tRPC client (dual transport: IPC or HTTP)
    │   └── query.ts           ← TanStack Query client setup
    ├── routes/                ← TanStack Router file-based routes
    │   ├── __root.tsx         ← root layout (nav, toasts, theme)
    │   ├── index.tsx          ← dashboard
    │   ├── notes.tsx          ← notes route
    │   ├── files.tsx          ← file explorer route
    │   ├── stream.tsx         ← live data route
    │   └── settings.tsx       ← settings window route
    ├── components/
    │   ├── ui/                ← base components
    │   │   ├── Modal.tsx
    │   │   ├── Toast.tsx
    │   │   └── Spinner.tsx
    │   └── ...                ← domain components
    ├── hooks/                 ← custom hooks (offline, theme, shortcuts)
    ├── index.html
    └── public/                ← static assets (images, fonts)
```

---

## TODO — ranked foundational first

### Phase 1 — Restructure & foundation
These unblock everything else. Do in order.

- [x] **Reorganize src/ into backend/ / shared/ / renderer/** ✓

- [x] **Zod v3 in backend + shared/schemas.ts** ✓ — Zod v3 added to
      `perry.compilePackages`; validates inputs in backend/api.ts. shared/schemas.ts
      defines output shapes for renderer type inference. (Zod v4 compiles but
      crashes at runtime — see Perry constraints above.)

- [x] **tRPC server in backend — deferred**: needs `perry.compilePackages` opt-in
      and runtime testing. Custom router stays for now.

- [x] **Wire TanStack Query to renderer** ✓ — @tanstack/react-query installed,
      useQuery/useMutation in App.tsx, QueryClientProvider in renderer.tsx,
      optimistic updates on notes save. hooks.ts trimmed to useSubscription only.

- [x] **Single dev command** ✓ — `npm run dev` runs concurrently with colored
      output, `vite --open` auto-opens browser.

- [x] **Shared logger (backend/services/logger.ts)** ✓ — writes to
      `app.getPath("userData")/ground-control.log`, debug-logs every IPC call,
      also pipes to stdout/stderr in dev mode.

- [x] **Set app name** ✓ — `app.setName("Ground Control")` in index.ts.
      Logs now land in `~/Library/Application Support/Ground Control/`.

### Insert after Phase 1 — UI foundation

- [x] **Tailwind CSS v4** ✓ — `@tailwindcss/vite` plugin, `@import "tailwindcss"` in
      styles.css, catppuccin Mocha theme tokens via `@theme`.

- [x] **Shadcn/ui + BaseUI primitive layer** ✓ — full shadcn component set installed
      with BaseUI primitives. Button, Badge, Textarea, Tooltip wired into App.tsx.
      `cn()` helper in lib/utils.ts, `@base-ui/react` + `cva` pattern established.

### Phase 2 — Data layer

- [x] **SQLite setup (backend/db/)** ✓ — better-sqlite3 works as a native addon.
      Drizzle ORM added to `perry.compilePackages` but has two Perry AOT bugs:
      (1) `.run()` on insert/update/delete silently returns null and doesn't execute;
      (2) `INTEGER PRIMARY KEY` columns return null in SELECT results.
      Workaround: use `getSqlite().prepare(...).run(...)` (raw better-sqlite3) for
      all mutations and queries. Drizzle schema kept for type inference only.

- [x] **Notes → SQLite CRUD** ✓ — full create/read/update/delete working via raw
      better-sqlite3 prepared statements. Notes page has inline edit, delete-on-hover,
      ⌘↵ shortcut to save.

- [x] **TanStack Router (file-based routes)** ✓ — `@tanstack/react-router` with
      Vite plugin, hash history for file:// compat, `__root.tsx` nav layout,
      `/` system, `/files`, `/notes` routes. Notes got delete-on-hover too.

- [x] **Public REST API example** ✓ — HackerNews top stories via public API
      (`/v0/topstories.json` + item hydration). News route shows rank, title,
      domain, score, comment count, time-ago. Skeleton loading state.

- [backlog] **WebSocket / live streaming example** — backend opens a WS connection
      or generates a stream; renderer subscribes and shows live data. In dev
      uses SSE transport, in prod uses IPC push.

- [x] **Offline detection** ✓ — `useOnlineStatus()` hook polls `navigator.onLine`
      every 3s (native window doesn't fire online/offline events reliably) + listens
      to window events for instant response in browser. Banner shown in root layout.
      TanStack Query pauses fetches automatically via default `networkMode: 'online'`.

### Phase 3 — File system & local data

- [ ] **Read/write app data directory** — settings JSON in app.getPath("userData"),
      exposed as settings.get / settings.set tRPC procedures.

- [ ] **File picker / save dialogs** — dialog.showOpenDialog /
      showSaveDialog exposed via IPC. In dev mode, falls back to browser
      File System Access API.

- [ ] **Local image / file rendering** — register a custom protocol
      (perry://local/...) so renderer can display arbitrary local files safely
      without exposing raw file:// access.

- [ ] **File watcher** — watch a directory for external changes, push updates
      to renderer via subscription. Uses fs.watch in backend.

- [ ] **Drag-and-drop files from OS** — renderer handles dragover/drop,
      sends file paths to backend for processing.

### Phase 4 — OS integration

- [revisit] **Native menus** — `Menu.setApplicationMenu` compiles and runs without
      error but is a true no-op; macOS default AppKit menu always shown instead.
      Flagged with maintainer: https://discord.com/channels/1514847466938437743/1520962880261066772/1520980039368183989

- [revisit] **Window management** — `BrowserWindow.setSize(w,h)` works but
      `getBounds()`/`getSize()` are not implemented and no `resize`/`move` events
      fire from the native window. Can't read current bounds or detect resize,
      so state can never be saved. Needs those APIs before this is possible.
      Flagged with maintainer: https://discord.com/channels/1514847466938437743/1520962880261066772/1520981761952055396

- [revisit] **Dark/light mode detection + theming** — renderer-side `matchMedia`
      works in both browser and native window; `useSystemTheme()` hook applies
      `dark` class to `<html>` on load and reacts to OS changes.
      `nativeTheme.shouldUseDarkColors` is hardcoded `false` in Perry (stub never
      reads the actual OS value) — [revisit] once fixed, can drive backend decisions
      (tray icon variants etc). Flagged with maintainer:
      https://discord.com/channels/1514847466938437743/1520962880261066772/1520983357406843022

- [ ] **Native OS notifications** — Notification API exposed via tRPC mutation.
      Works in both dev (browser Notification API) and prod (native).

- [ ] **Standard in-app keyboard shortcuts** — wire up common shortcuts inside
      the window: ⌘R reload, ⌘W close, ⌘, settings, ⌘[ / ⌘] back/forward.
      In dev these work free in the browser; in prod need webContents.reload()
      and Menu.setApplicationMenu() or registerLocalShortcut equivalents.

- [ ] **Global keyboard shortcuts** — register globalShortcut in backend,
      push events to renderer via IPC. In dev, use browser keydown listener.

- [ ] **Clipboard read/write** — clipboard.readText / writeText exposed as
      tRPC procedures.

- [ ] **Tray icon** — system tray with context menu. Show/hide main window.

- [ ] **Deep linking / custom URL protocol** — register myapp:// protocol,
      handle open-url events in backend, route to correct renderer page.

- [ ] **Auto-launch on startup toggle** — settings toggle that registers /
      deregisters the app with the OS login items.

### Phase 5 — Security

- [ ] **Preload hardening** — audit contextBridge surface, ensure no
      nodeIntegration, validate all IPC inputs in backend with Zod before
      handling.

- [ ] **Secure local storage (OS keychain)** — store secrets (API keys, tokens)
      in OS credential vault (Keychain on macOS, Credential Manager on Windows).
      Exposed as keychain.get / keychain.set procedures. Backend only — never
      crosses to renderer as plaintext.

### Phase 6 — UI patterns

- [ ] **Settings / preferences window** — separate route or BrowserWindow.
      Reads/writes via settings procedures. Includes theme toggle, startup
      preference, etc.

- [ ] **Modal / dialog system** — global modal stack in renderer. Triggered
      programmatically from anywhere.

- [ ] **Toast / notification system (in-app)** — lightweight toast stack.
      Triggered from mutation onSuccess/onError handlers.

- [ ] **Loading / splash screen** — shown while backend initializes (DB
      migrations, first-launch setup). Hides once backend signals ready via IPC.
