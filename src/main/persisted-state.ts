import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { app } from 'electron'

import type { AiProvider } from '@shared/types'

type PersistedState = {
  lastRepoPath?: string
  lastPrUrl?: string
  excludedFilePatterns?: string[]
  aiProvider?: AiProvider
  cliModel?: string
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

export function getExcludedFilePatterns(): string[] {
  return read().excludedFilePatterns ?? []
}

export function setExcludedFilePatterns(patterns: string[]): void {
  write({ ...read(), excludedFilePatterns: patterns })
}

export function getAiProvider(): AiProvider {
  return read().aiProvider ?? 'api'
}

export function setAiProvider(provider: AiProvider): void {
  write({ ...read(), aiProvider: provider })
}

export function getCliModel(): string {
  return read().cliModel ?? ''
}

export function setCliModel(model: string): void {
  write({ ...read(), cliModel: model })
}
