const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("__PERRY_IPC__", {
  invoke: (channel, input) => ipcRenderer.invoke(channel, input),
  on: (channel, cb) => {
    const handler = (_event, data) => cb(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
})
