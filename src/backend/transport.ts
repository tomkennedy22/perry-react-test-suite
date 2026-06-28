import { ipcMain, BrowserWindow } from "electron"
import * as http from "http"
import type { AppRouter } from "./api"
import { logger } from "./services/logger"

const DEV_PORT = 3131

type RouterOpts = {
  getWindow: () => BrowserWindow | null
  devMode: boolean
}

export function mountRouter(router: AppRouter, opts: RouterOpts) {
  for (const [ns, procs] of Object.entries(router)) {
    for (const [name, proc] of Object.entries(procs as Record<string, any>)) {
      if (proc._type === "query" || proc._type === "mutation") {
        ipcMain.handle(`${ns}.${name}`, (_event, input) => {
          logger.debug(`ipc ${ns}.${name}`)
          return proc.handler(input)
        })
      }
    }
  }

  if (opts.devMode) {
    startDevServer(router)
  }

  function startSubscriptions() {
    const win = opts.getWindow()
    if (!win) return
    for (const [ns, procs] of Object.entries(router)) {
      for (const [name, proc] of Object.entries(procs as Record<string, any>)) {
        if (proc._type === "subscription") {
          const channel = `${ns}.${name}`
          const stop = proc.start((data: unknown) => {
            if (!win.isDestroyed()) win.webContents.send(channel, data)
          })
          win.once("closed", stop)
        }
      }
    }
  }

  return { startSubscriptions }
}

function startDevServer(router: AppRouter) {
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")

    if (req.method === "OPTIONS") {
      res.writeHead(204).end()
      return
    }

    const url = new URL(req.url!, `http://localhost:${DEV_PORT}`)
    const match = url.pathname.match(/^\/trpc\/([\w.]+?)(\/subscribe)?$/)
    if (!match) { res.writeHead(404).end(); return }

    const [ns, name] = match[1].split(".")
    const isSubscribe = !!match[2]
    const proc = (router as any)[ns]?.[name]
    if (!proc) { res.writeHead(404).end(JSON.stringify({ error: "Not found" })); return }

    if (isSubscribe && proc._type === "subscription") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      })
      const stop = proc.start((data: unknown) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`)
      })
      req.on("close", stop)
      return
    }

    if (proc._type === "query" && req.method === "GET") {
      const raw = url.searchParams.get("input")
      const input = raw ? JSON.parse(decodeURIComponent(raw)) : undefined
      proc.handler(input)
        .then((result: unknown) => {
          res.writeHead(200, { "Content-Type": "application/json" })
          res.end(JSON.stringify(result))
        })
        .catch((err: Error) => {
          res.writeHead(500, { "Content-Type": "application/json" })
          res.end(JSON.stringify({ error: err.message }))
        })
      return
    }

    if (proc._type === "mutation" && req.method === "POST") {
      let body = ""
      req.on("data", (chunk: Buffer) => { body += chunk })
      req.on("end", () => {
        const input = body ? JSON.parse(body) : undefined
        proc.handler(input)
          .then((result: unknown) => {
            res.writeHead(200, { "Content-Type": "application/json" })
            res.end(JSON.stringify(result))
          })
          .catch((err: Error) => {
            res.writeHead(500, { "Content-Type": "application/json" })
            res.end(JSON.stringify({ error: err.message }))
          })
      })
      return
    }

    res.writeHead(405).end()
  })

  server.listen(DEV_PORT, () => {
    console.log(`[dev] API server → http://localhost:${DEV_PORT}`)
    console.log(`[dev] Open renderer → http://localhost:5173`)
  })
}
