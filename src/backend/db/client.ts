import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import * as path from "path"
import * as fs from "fs"
import { app } from "electron"
import * as schema from "./schema"
import { logger } from "../services/logger"

function dbPath() {
  const dir = app.getPath("userData")
  try { fs.mkdirSync(dir, { recursive: true }) } catch {}
  const p = path.join(dir, "perry-desktop-test-suite.db")
  logger.info(`[db] path: ${p}`)
  return p
}

function init() {
  const g = globalThis as any
  if (g.__gcInited) {
    logger.info("[db] already inited, reusing singleton")
    return
  }
  const p = dbPath()
  logger.info(`[db] opening: ${p}`)
  const sqlite = new Database(p)
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
  const countRow = sqlite.prepare("SELECT COUNT(*) as n FROM notes").get() as any
  logger.info(`[db] opened ok — notes row: ${JSON.stringify(countRow)}`)
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
