import { app, BrowserWindow } from "electron"
import * as path from "path"
import { router } from "./api"
import { mountRouter } from "./router"

const DEV = process.env.PERRY_DEV === "1"

let mainWindow: BrowserWindow | null = null

const { startSubscriptions } = mountRouter(router, {
  getWindow: () => mainWindow,
  devMode: DEV,
})

app.whenReady().then(() => {
  if (DEV) {
    // No window in dev — renderer runs in your browser via Vite (localhost:5173)
    console.log("Running in dev mode. Open http://localhost:5173 in your browser.")
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: "System Explorer (Perry × Electron)",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  })

  mainWindow.loadFile(path.join(__dirname, "renderer", "dist", "index.html"))
  mainWindow.webContents.on("did-finish-load", startSubscriptions)

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = new BrowserWindow({
        width: 900,
        height: 640,
        title: "System Explorer (Perry × Electron)",
        webPreferences: { preload: path.join(__dirname, "preload.js") },
      })
      mainWindow.loadFile(path.join(__dirname, "renderer", "dist", "index.html"))
      mainWindow.webContents.on("did-finish-load", startSubscriptions)
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
