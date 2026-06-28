import { z } from "zod"

// ---- fs ----

export const FsEntrySchema = z.object({
  name: z.string(),
  isDir: z.boolean(),
  sizeBytes: z.number(),
})

export const FsListResultSchema = z.object({
  dir: z.string(),
  entries: z.array(FsEntrySchema),
})

export const FsReadResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), text: z.string() }),
  z.object({ ok: z.literal(false), error: z.string() }),
])

// ---- notes ----

export const NotesSaveResultSchema = z.object({
  ok: z.literal(true),
  count: z.number(),
})

// ---- system ----

export const SystemInfoSchema = z.object({
  platform: z.string(),
  arch: z.string(),
  hostname: z.string(),
  cpus: z.number(),
  cpuModel: z.string(),
  totalMemMB: z.number(),
  freeMemMB: z.number(),
  uptimeSec: z.number(),
  release: z.string(),
  homedir: z.string(),
})

// ---- derived types ----

export type FsEntry = z.infer<typeof FsEntrySchema>
export type FsListResult = z.infer<typeof FsListResultSchema>
export type FsReadResult = z.infer<typeof FsReadResultSchema>
export type SystemInfo = z.infer<typeof SystemInfoSchema>
