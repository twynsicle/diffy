import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { app } from 'electron'

type PersistedState = {
  lastRepoPath?: string
  lastPrUrl?: string
}

function getFilePath(): string {
  return join(app.getPath('userData'), 'persisted-state.json')
}

function read(): PersistedState {
  try {
    const raw = readFileSync(getFilePath(), 'utf-8')
    return JSON.parse(raw) as PersistedState
  } catch {
    return {}
  }
}

function write(state: PersistedState): void {
  try {
    writeFileSync(getFilePath(), JSON.stringify(state, null, 2), 'utf-8')
  } catch {
    // Best-effort persistence — don't crash if userData is unwritable
  }
}

export function getLastRepoPath(): string | null {
  return read().lastRepoPath ?? null
}

export function setLastRepoPath(repoPath: string): void {
  write({ ...read(), lastRepoPath: repoPath })
}

export function getLastPrUrl(): string | null {
  return read().lastPrUrl ?? null
}

export function setLastPrUrl(url: string): void {
  write({ ...read(), lastPrUrl: url })
}
