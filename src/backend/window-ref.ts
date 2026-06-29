import { BrowserWindow } from "electron"

let _mainWindow: BrowserWindow | null = null

export function setMainWindow(w: BrowserWindow | null) { _mainWindow = w }
export function getMainWindow() { return _mainWindow }
