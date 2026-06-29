# Perry Desktop Test Suite

An open-source kitchen-sink reference app built on [Perry](https://github.com/PerryTS/perry) — a runtime that compiles TypeScript directly to native LLVM binaries. This repo exercises the full desktop app stack: native binary backend, Electron-compatible windowing, React/Vite renderer, SQLite persistence, REST APIs, subscriptions, and OS integration.

The goal is to document what works, what doesn't, and what the Perry ecosystem needs to support real-world desktop apps. Every feature either works end-to-end or is documented with a maintainer issue.

## Stack

| Layer | Technology |
|---|---|
| Backend runtime | Perry (TypeScript → native binary, AOT compiled) |
| Windowing | `feat/electron-compat` branch — Electron-compatible API over Perry native |
| Renderer | React 19 + Vite (single-file build via `vite-plugin-singlefile`) |
| Routing | TanStack Router (file-based, hash history for `file://` compat) |
| Data fetching | TanStack Query |
| UI | shadcn/ui + Base UI primitives + Tailwind CSS v4 |
| Styling | Catppuccin Mocha theme via `@theme` tokens |
| Database | better-sqlite3 (raw SQL — Drizzle ORM has AOT bugs, see below) |
| Validation | Zod v3 (v4 crashes under Perry AOT) |
| Transport | IPC in native window, HTTP+SSE on `:3131` in dev mode |

## Prerequisites

### 1. Build Perry from source

The `feat/electron-compat` branch is not published to npm. You must build it locally.

```bash
git clone https://github.com/PerryTS/perry
cd perry
git checkout feat/electron-compat
cargo build --release
cargo build --release -p perry-ui-macos
```

The compiled binary will be at `target/release/perry`. The scripts in this repo assume the clone is at `/tmp/perry-electron-compat` — adjust `package.json` if yours is elsewhere.

### 2. Install the local electron package

The `electron` dependency in `package.json` points to the local Perry electron-compat package:

```json
"electron": "file:../../../../private/tmp/perry-electron-compat/packages/electron"
```

Update this path to match your Perry clone location, then run:

```bash
npm install
```

### 3. Build the initial binary

Before running dev mode you need a compiled binary:

```bash
npm run compile
```

This runs `vite build` (renderer) then `perry compile` (backend), producing `./ground-control`.

## Running

### Dev mode (browser)

```bash
npm run dev
```

Runs the backend binary with `PERRY_DEV=1` (starts HTTP server on `:3131`, no native window) and Vite dev server on `:5173` (auto-opens in browser). Both run concurrently with colored output.

Changes to the renderer hot-reload instantly. Changes to the backend require a recompile (`npm run compile`) and restart.

```bash
npm run dev:backend    # backend only
npm run dev:renderer   # renderer only
```

### Native window (compiled)

```bash
npm run compile    # vite build + perry compile → ./ground-control
./ground-control   # launch native window
```

Or build and launch in one step:

```bash
npm start
```

## Project structure

```
src/
├── backend/                  ← Perry native process (compiled to binary)
│   ├── index.ts              ← entry: app lifecycle, BrowserWindow, menu
│   ├── api.ts                ← typed router with query/mutation/subscription
│   ├── transport/            ← IPC (prod) + HTTP+SSE (dev)
│   ├── db/
│   │   ├── client.ts         ← better-sqlite3 singleton (getDb / getSqlite)
│   │   └── schema.ts         ← Drizzle schema (type inference only)
│   ├── services/
│   │   ├── logger.ts         ← file logger → ~/Library/.../ground-control.log
│   │   └── hackernews.ts     ← HN top stories via public API
│   └── window-ref.ts         ← shared mainWindow reference
└── renderer/                 ← Vite/React (browser + webview)
    ├── index.html
    ├── renderer.tsx           ← createRoot + RouterProvider
    ├── api-client.ts          ← proxy client (auto-detects IPC vs HTTP)
    ├── hooks.ts               ← useSubscription, useOnlineStatus, useSystemTheme
    ├── routes/
    │   ├── __root.tsx         ← root layout: nav, clock, offline banner
    │   ├── index.tsx          ← System info + window state + notifications test
    │   ├── files.tsx          ← file explorer with preview pane
    │   ├── notes.tsx          ← SQLite-backed notes (CRUD)
    │   └── news.tsx           ← HackerNews top stories
    └── public/
        ├── perry-favicon.svg
        ├── perry-icon.svg
        └── perry-icon.png     ← generated from SVG via rsvg-convert
```

## Perry gotchas

These are hard-won discoveries from building this app. Check `TODO.md` for the full list with maintainer issue links.

**`perry.compilePackages` is required for any npm package used in the backend.**
Perry has no V8 runtime — it can't execute pre-compiled JS. Every npm package used server-side must be listed in both `perry.compilePackages` and `perry.allow.compilePackages` in `package.json`.

```json
"perry": {
  "compilePackages": ["zod", "drizzle-orm"],
  "allow": { "compilePackages": ["zod", "drizzle-orm"] }
}
```

**Use Zod v3, not v4.**
Zod v4 crashes at runtime under Perry AOT (`Cannot read properties of undefined (reading 'run')`). Pin to v3.

**Drizzle ORM mutations don't work under Perry AOT.**
`insert().run()`, `update().run()`, `delete().run()` all return `null` and don't execute. Additionally, `INTEGER PRIMARY KEY` columns return `null` in SELECT results. Workaround: use raw `better-sqlite3` prepared statements (`getSqlite().prepare(...).run(...)`) for all mutations and queries. The Drizzle schema is kept for TypeScript type inference only.

**`__dirname` resolves at compile time relative to the source file.**
If your entry is `src/backend/index.ts`, then `__dirname` inside that file bakes in the absolute path to `src/backend/` at compile time. Use `path.join(__dirname, "..", "renderer", "dist", "index.html")` to reference renderer assets.

**`app.setName()` must be called before any code that calls `app.getPath()`.**
Static imports are all hoisted — if a module calls `app.getPath("userData")` at import time, it runs before `app.setName()` in your entry file. Use lazy initialization (call `getPath` inside a function, not at module load).

**`createHashHistory` is required for TanStack Router.**
The renderer is loaded as a `file://` URL in the native window, so HTML5 history doesn't work. Use `createHashHistory()` when setting up the router.

**Native window doesn't fire `online`/`offline` events.**
`navigator.onLine` updates correctly, but the browser events don't fire from Perry's WebView. Poll `navigator.onLine` on an interval as a fallback.
