import * as os from "os"
import * as fs from "fs"
import * as path from "path"
import { z } from "zod"
import { app, BrowserWindow, nativeTheme, shell, dialog } from "electron"
import { getSqlite } from "./db/client"
import { getMainWindow } from "./window-ref"
import { fetchTopStories } from "./services/hackernews"
import { loadSettings, saveSettings } from "./services/settings"
import { logger } from "./services/logger"

// ---- Procedure types ----

export type QueryProcedure<TInput, TOutput> = {
  _type: "query"
  handler: (input: TInput) => Promise<TOutput>
}

export type MutationProcedure<TInput, TOutput> = {
  _type: "mutation"
  handler: (input: TInput) => Promise<TOutput>
}

export type SubscriptionProcedure<TOutput> = {
  _type: "subscription"
  start: (emit: (data: TOutput) => void) => () => void
}

export type AnyProcedure =
  | QueryProcedure<any, any>
  | MutationProcedure<any, any>
  | SubscriptionProcedure<any>

// ---- Procedure builders ----

export function query<TOutput>(
  handler: () => TOutput | Promise<TOutput>
): QueryProcedure<void, TOutput>
export function query<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>
): QueryProcedure<TInput, TOutput>
export function query(handler: (input?: any) => any): QueryProcedure<any, any> {
  return { _type: "query", handler: async (i) => handler(i) }
}

export function mutation<TOutput>(
  handler: () => TOutput | Promise<TOutput>
): MutationProcedure<void, TOutput>
export function mutation<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>
): MutationProcedure<TInput, TOutput>
export function mutation(handler: (input?: any) => any): MutationProcedure<any, any> {
  return { _type: "mutation", handler: async (i) => handler(i) }
}

export function subscription<TOutput>(
  start: (emit: (data: TOutput) => void) => () => void
): SubscriptionProcedure<TOutput> {
  return { _type: "subscription", start }
}

// ---- Helpers ----

// ---- Router ----

export const router = {
  window: {
    info: query(() => {
      const w = getMainWindow()
      function tryGet<T>(fn: () => T): T | null {
        try { return fn() } catch { return null }
      }
      return {
        available: w !== null,
        openCount:    tryGet(() => BrowserWindow.getAllWindows().length),
        focusedTitle: tryGet(() => BrowserWindow.getFocusedWindow() !== null ? "yes" : "no"),
        isDestroyed:  tryGet(() => w!.isDestroyed()),
        bounds:       tryGet(() => (w as any).getBounds()),
        size:         tryGet(() => (w as any).getSize()),
        position:     tryGet(() => (w as any).getPosition()),
        contentSize:  tryGet(() => (w as any).getContentSize()),
        isMaximized:  tryGet(() => (w as any).isMaximized()),
        isMinimized:  tryGet(() => (w as any).isMinimized()),
        isFullScreen: tryGet(() => (w as any).isFullScreen()),
        isFocused:    tryGet(() => (w as any).isFocused()),
        isVisible:    tryGet(() => (w as any).isVisible()),
        title:        tryGet(() => (w as any).getTitle()),
        isResizable:  tryGet(() => (w as any).isResizable()),
        isMovable:    tryGet(() => (w as any).isMovable()),
        opacity:      tryGet(() => (w as any).getOpacity()),
        nativeThemeDark: tryGet(() => nativeTheme.shouldUseDarkColors),
        nativeThemeSource: tryGet(() => nativeTheme.themeSource),
      }
    }),

    close: mutation(async () => {
      app.quit()
      return { ok: true as const }
    }),
  },

  system: {
    info: query(async () => ({
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model ?? "unknown",
      totalMemMB: Math.round(os.totalmem() / (1024 * 1024)),
      freeMemMB: Math.round(os.freemem() / (1024 * 1024)),
      uptimeSec: Math.round(os.uptime()),
      release: os.release(),
      homedir: os.homedir(),
      userData: app.getPath("userData"),
      appName: app.getName(),
      appVersion: app.getVersion(),
      appLocale: (app as any).getLocale ? (app as any).getLocale() : null,
    })),
  },

  fs: {
    list: query(async (dirPath: string) => {
      const target = z.string().optional().parse(dirPath) || os.homedir()
      const out: Array<{ name: string; isDir: boolean; sizeBytes: number }> = []
      for (const name of fs.readdirSync(target)) {
        if (name.startsWith(".")) continue
        try {
          const st = fs.statSync(path.join(target, name))
          out.push({ name, isDir: st.isDirectory(), sizeBytes: st.size })
        } catch {}
      }
      out.sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name < b.name ? -1 : 1
      })
      return { dir: target, entries: out }
    }),

    read: query(async (filePath: string) => {
      const target = z.string().parse(filePath)
      const st = fs.statSync(target)
      if (st.size > 256 * 1024) return { ok: false as const, error: "File too large to preview (>256KB)" }
      return { ok: true as const, text: fs.readFileSync(target, "utf8").slice(0, 20000) }
    }),

    pick: mutation(async (opts: { directory?: boolean }) => {
      const { directory = false } = z.object({ directory: z.boolean().optional() }).parse(opts)
      const result = await dialog.showOpenDialog({
        properties: directory ? ["openDirectory"] : ["openFile"],
      })
      if (result.canceled || result.filePaths.length === 0) return { canceled: true as const }
      return { canceled: false as const, path: result.filePaths[0] }
    }),
  },

  notes: {
    list: query(async () => {
      // CAST integers to TEXT — Perry AOT returns null for INTEGER columns from .all()
      const raw = getSqlite()
        .prepare("SELECT CAST(id AS TEXT) as id, body, CAST(created_at AS TEXT) as createdAt, CAST(updated_at AS TEXT) as updatedAt FROM notes ORDER BY created_at DESC")
        .all() as Array<{ id: string; body: string; createdAt: string; updatedAt: string }>
      const rows = raw.map(r => ({ id: Number(r.id), body: r.body, createdAt: Number(r.createdAt), updatedAt: Number(r.updatedAt) }))
      logger.info(`[notes.list] returning ${rows.length} rows, first id=${rows[0]?.id}`)
      return rows
    }),

    // NOTE: better-sqlite3 .prepare().run(params) parameter binding is silently
    // broken under Perry AOT — params are not applied, so nothing is written.
    // Workaround: .exec() with escaped literal SQL. .exec() takes raw SQL strings
    // with no binding layer and works correctly.
    create: mutation(async (body: string) => {
      const validated = z.string().min(1).parse(body)
      const now = Date.now()
      const escaped = validated.replace(/'/g, "''")
      getSqlite().exec(`INSERT INTO notes (body, created_at, updated_at) VALUES ('${escaped}', ${now}, ${now})`)
      logger.info(`[notes.create] inserted body="${validated.slice(0, 40)}"`)
      return { ok: true as const }
    }),

    update: mutation(async (input: { id: number; body: string }) => {
      const { id, body } = z.object({ id: z.number(), body: z.string().min(1) }).parse(input)
      const escaped = body.replace(/'/g, "''")
      getSqlite().exec(`UPDATE notes SET body = '${escaped}', updated_at = ${Date.now()} WHERE id = ${id}`)
      logger.info(`[notes.update] id=${id}`)
      return { ok: true as const }
    }),

    delete: mutation(async (id: number) => {
      const validated = z.number().parse(id)
      getSqlite().exec(`DELETE FROM notes WHERE id = ${validated}`)
      logger.info(`[notes.delete] id=${validated}`)
      return { ok: true as const }
    }),

    clearAll: mutation(async () => {
      getSqlite().exec(`DELETE FROM notes`)
      return { ok: true as const }
    }),
  },

  clock: {
    tick: subscription<string>((emit) => {
      const timer = setInterval(() => emit(new Date().toISOString()), 1000)
      return () => clearInterval(timer)
    }),
  },

  news: {
    top: query(async () => fetchTopStories(30)),
  },

  settings: {
    get: query(async () => loadSettings()),
    set: mutation(async (patch: { theme?: "system" | "light" | "dark" }) => {
      const validated = z.object({
        theme: z.enum(["system", "light", "dark"]).optional(),
      }).parse(patch)
      saveSettings(validated)
      return { ok: true as const }
    }),
  },

  shell: {
    openExternal: mutation(async (url: string) => {
      const validated = z.string().url().parse(url)
      await shell.openExternal(validated)
      return { ok: true as const }
    }),

    openPath: mutation(async (filePath: string) => {
      const validated = z.string().min(1).parse(filePath)
      await shell.openPath(validated)
      return { ok: true as const }
    }),
  },
}

export type AppRouter = typeof router
