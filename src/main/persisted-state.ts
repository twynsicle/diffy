import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { app } from 'electron'

import type {
  AiProvider,
  NarrativeCacheLookup,
  NarrativeReviewCacheEntry,
  PrReference,
} from '@shared/types'

const NARRATIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

type PersistedState = {
  lastRepoPath?: string
  lastPrUrl?: string
  excludedFilePatterns?: string[]
  aiProvider?: AiProvider
  cliModel?: string
  commitPanelVisible?: boolean
  narrativeReviewCache?: Record<string, NarrativeReviewCacheEntry>
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

export function getCommitPanelVisible(): boolean {
  return read().commitPanelVisible ?? true
}

export function setCommitPanelVisible(visible: boolean): void {
  write({ ...read(), commitPanelVisible: visible })
}

function makeGithubPrCacheKey(ref: PrReference): string {
  return `github-pr:${ref.owner}/${ref.repo}#${String(ref.number)}`
}

function makeNarrativeCacheKey(
  lookup:
    | Pick<NarrativeCacheLookup, 'source' | 'prRef'>
    | Pick<NarrativeReviewCacheEntry, 'source' | 'prRef'>,
): string | null {
  if (lookup.source === 'github-pr') {
    return lookup.prRef ? makeGithubPrCacheKey(lookup.prRef) : null
  }

  return lookup.source
}

function isNarrativeCacheExpired(entry: NarrativeReviewCacheEntry, now: number): boolean {
  const cachedAt = Date.parse(entry.cachedAt)
  if (Number.isNaN(cachedAt)) {
    return true
  }
  return now - cachedAt > NARRATIVE_CACHE_TTL_MS
}

function matchesNarrativeCacheLookup(
  entry: NarrativeReviewCacheEntry,
  lookup: NarrativeCacheLookup,
): boolean {
  if (entry.source !== lookup.source) {
    return false
  }

  if (entry.source === 'github-pr') {
    return true
  }

  if (!lookup.cacheContext || entry.cacheContext.source !== lookup.source) {
    return false
  }

  if (entry.source === 'branch-diff') {
    return (
      lookup.cacheContext.source === 'branch-diff' &&
      entry.cacheContext.branchName === lookup.cacheContext.branchName &&
      entry.cacheContext.headSha === lookup.cacheContext.headSha &&
      entry.cacheContext.baseSha === lookup.cacheContext.baseSha
    )
  }

  return (
    lookup.cacheContext.source === 'uncommitted' &&
    entry.cacheContext.headSha === lookup.cacheContext.headSha &&
    entry.cacheContext.diffHash === lookup.cacheContext.diffHash
  )
}

export function getCachedNarrativeReview(
  lookup: NarrativeCacheLookup,
): NarrativeReviewCacheEntry | null {
  const key = makeNarrativeCacheKey(lookup)
  if (!key) {
    return null
  }

  const state = read()
  const entry = state.narrativeReviewCache?.[key]
  if (!entry) {
    return null
  }

  if (isNarrativeCacheExpired(entry, Date.now()) || !matchesNarrativeCacheLookup(entry, lookup)) {
    return null
  }

  return entry
}

export function setCachedNarrativeReview(entry: NarrativeReviewCacheEntry): void {
  const key = makeNarrativeCacheKey(entry)
  if (!key) {
    return
  }

  const state = read()
  write({
    ...state,
    narrativeReviewCache: {
      ...(state.narrativeReviewCache ?? {}),
      [key]: entry,
    },
  })
}

export function pruneExpiredNarrativeReviews(now: number = Date.now()): void {
  const state = read()
  const cache = state.narrativeReviewCache
  if (!cache) {
    return
  }

  const nextEntries = Object.entries(cache).filter(
    ([, entry]) => !isNarrativeCacheExpired(entry, now),
  )
  const nextCache = Object.fromEntries(nextEntries)

  if (nextEntries.length === Object.keys(cache).length) {
    return
  }

  write({
    ...state,
    narrativeReviewCache: Object.keys(nextCache).length > 0 ? nextCache : undefined,
  })
}
