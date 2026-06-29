import * as os from "os"
import * as fs from "fs"
import * as path from "path"
import { app } from "electron"
import { z } from "zod"
import { getSqlite } from "./db/client"
import { fetchTopStories } from "./services/hackernews"

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
  },

  notes: {
    list: query(async () => {
      return getSqlite()
        .prepare("SELECT id, body, created_at as createdAt, updated_at as updatedAt FROM notes ORDER BY created_at DESC")
        .all() as Array<{ id: number; body: string; createdAt: number; updatedAt: number }>
    }),

    create: mutation(async (body: string) => {
      const validated = z.string().min(1).parse(body)
      const now = Date.now()
      getSqlite()
        .prepare("INSERT INTO notes (body, created_at, updated_at) VALUES (?, ?, ?)")
        .run(validated, now, now)
      return { ok: true as const }
    }),

    update: mutation(async (input: { id: number; body: string }) => {
      const { id, body } = z.object({ id: z.number(), body: z.string().min(1) }).parse(input)
      getSqlite()
        .prepare("UPDATE notes SET body = ?, updated_at = ? WHERE id = ?")
        .run(body, Date.now(), id)
      return { ok: true as const }
    }),

    delete: mutation(async (id: number) => {
      const validated = z.number().parse(id)
      getSqlite()
        .prepare("DELETE FROM notes WHERE id = ?")
        .run(validated)
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
}

export type AppRouter = typeof router
