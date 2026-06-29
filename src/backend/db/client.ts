import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as path from "path"
import * as fs from "fs"
import { app } from "electron"
import * as schema from "./schema"

function dbPath() {
  const dir = app.getPath("userData")
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  return path.join(dir, "ground-control.db")
}

function init() {
  const g = globalThis as any
  if (g.__gcInited) return
  const sqlite = new Database(dbPath())
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      body       TEXT    NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  g.__gcSqlite = sqlite
  g.__gcDb = drizzle(sqlite, { schema })
  g.__gcInited = true
}

// Drizzle instance — use for SELECT queries
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  init()
  return (globalThis as any).__gcDb
}

// Raw better-sqlite3 — use for INSERT / UPDATE / DELETE
export function getSqlite(): Database.Database {
  init()
  return (globalThis as any).__gcSqlite
}
