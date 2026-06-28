import { app, BrowserWindow } from "electron"
import * as path from "path"
import { router } from "./api"
import { mountRouter } from "./transport"
import { logger } from "./services/logger"

const DEV = process.env.PERRY_DEV === "1"

app.setName("Ground Control")

let mainWindow: BrowserWindow | null = null

const { startSubscriptions } = mountRouter(router, {
  getWindow: () => mainWindow,
  devMode: DEV,
})

app.whenReady().then(() => {
  logger.info(`Ground Control starting (${DEV ? "dev" : "prod"})`)

  if (DEV) {
    logger.info("Dev mode — renderer at http://localhost:5173, API at http://localhost:3131")
    return
  }

  mainWindow = new BrowserWindow({
    width: 900,
    height: 640,
    title: "Ground Control",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  })

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"))
  mainWindow.webContents.on("did-finish-load", () => {
    logger.info("Renderer loaded")
    startSubscriptions()
  })

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = new BrowserWindow({
        width: 900,
        height: 640,
        title: "Ground Control",
        webPreferences: { preload: path.join(__dirname, "preload.js") },
      })
      mainWindow.loadFile(path.join(__dirname, "..", "renderer", "dist", "index.html"))
      mainWindow.webContents.on("did-finish-load", startSubscriptions)
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})
