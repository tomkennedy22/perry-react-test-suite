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

// Menu.setApplicationMenu is a no-op in current Perry electron-compat — template
// is accepted without error but macOS default AppKit menu always shows instead.
// Flagged with maintainer: https://discord.com/channels/1514847466938437743/1520962880261066772/1520980039368183989
//
// import { Menu } from "electron"
// app.whenReady().then(() => {
//   Menu.setApplicationMenu(Menu.buildFromTemplate([
//     { label: "Ground Control", submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }] },
//     { label: "Edit", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
//     { label: "View", submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "togglefullscreen" }] },
//     { label: "Window", submenu: [{ role: "minimize" }, { role: "zoom" }, { type: "separator" }, { role: "front" }] },
//   ]))
// })

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
