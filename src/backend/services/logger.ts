import * as fs from "fs"
import * as path from "path"
import { app } from "electron"

type Level = "info" | "warn" | "error" | "debug"

function logFilePath() {
  return path.join(app.getPath("userData"), "perry-desktop-test-suite.log")
}

function write(level: Level, msg: string) {
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${msg}\n`
  // Always write to file
  try { fs.appendFileSync(logFilePath(), line, "utf8") } catch {}
  // In dev, also print to stdout/stderr
  if (process.env.PERRY_DEV === "1") {
    if (level === "error" || level === "warn") process.stderr.write(line)
    else process.stdout.write(line)
  }
}

export const logger = {
  info:  (msg: string) => write("info",  msg),
  warn:  (msg: string) => write("warn",  msg),
  error: (msg: string) => write("error", msg),
  debug: (msg: string) => write("debug", msg),
}
