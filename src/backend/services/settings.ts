import * as fs from "fs"
import * as path from "path"
import { app } from "electron"

interface Settings {
  githubToken?: string
}

function settingsPath() {
  return path.join(app.getPath("userData"), "settings.json")
}

export function loadSettings(): Settings {
  try { return JSON.parse(fs.readFileSync(settingsPath(), "utf8")) }
  catch { return {} }
}

export function saveSettings(patch: Partial<Settings>) {
  const current = loadSettings()
  fs.writeFileSync(settingsPath(), JSON.stringify({ ...current, ...patch }, null, 2), "utf8")
}
