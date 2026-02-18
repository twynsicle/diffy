import type { BrowserWindow } from 'electron'

const FOREGROUND_POLL_MS = 1000
const BACKGROUND_POLL_MS = 5000

let pollTimer: ReturnType<typeof setInterval> | null = null
let currentWindow: BrowserWindow | null = null
let isFocused = true

function sendStatusChanged(): void {
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.webContents.send('watcher.statusChanged')
  }
}

function restartPoll(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
  }
  const interval = isFocused ? FOREGROUND_POLL_MS : BACKGROUND_POLL_MS
  pollTimer = setInterval(sendStatusChanged, interval)
}

function handleFocus(): void {
  isFocused = true
  restartPoll()
  // Fire an immediate poll on re-focus for snappy UX
  sendStatusChanged()
}

function handleBlur(): void {
  isFocused = false
  restartPoll()
}

export function startWatching(_repoRoot: string, mainWindow: BrowserWindow): void {
  stopWatching()

  currentWindow = mainWindow
  isFocused = mainWindow.isFocused()

  mainWindow.on('focus', handleFocus)
  mainWindow.on('blur', handleBlur)

  restartPoll()
}

export function stopWatching(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (currentWindow && !currentWindow.isDestroyed()) {
    currentWindow.removeListener('focus', handleFocus)
    currentWindow.removeListener('blur', handleBlur)
  }
  currentWindow = null
}
