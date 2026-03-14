import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NarrativeReviewCacheEntry } from '@shared/types'

const userDataDir = mkdtempSync(join(tmpdir(), 'diffy-persisted-state-'))

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => userDataDir),
  },
}))

import {
  getCachedNarrativeReview,
  pruneExpiredNarrativeReviews,
  setCachedNarrativeReview,
} from './persisted-state'

describe('persisted-state narrative review cache', () => {
  beforeEach(() => {
    rmSync(join(userDataDir, 'persisted-state.json'), { force: true })
  })

  afterEach(() => {
    rmSync(join(userDataDir, 'persisted-state.json'), { force: true })
  })

  it('returns null when no cache exists', () => {
    expect(getCachedNarrativeReview({ source: 'branch-diff' })).toBeNull()
  })

  it('returns cached GitHub PR review for same PR key', () => {
    const entry = makeGithubCacheEntry()
    setCachedNarrativeReview(entry)

    expect(
      getCachedNarrativeReview({
        source: 'github-pr',
        prRef: { owner: 'openai', repo: 'diffy', number: 12 },
        cacheContext: { source: 'github-pr' },
      }),
    ).toEqual(entry)
  })

  it('does not return cached GitHub PR review for different PR key', () => {
    setCachedNarrativeReview(makeGithubCacheEntry())

    expect(
      getCachedNarrativeReview({
        source: 'github-pr',
        prRef: { owner: 'openai', repo: 'diffy', number: 13 },
        cacheContext: { source: 'github-pr' },
      }),
    ).toBeNull()
  })

  it('returns branch cache only when branch context matches', () => {
    const entry = makeBranchCacheEntry()
    setCachedNarrativeReview(entry)

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/cache',
          headSha: 'head-sha',
          baseSha: 'base-sha',
        },
      }),
    ).toEqual(entry)
  })

  it('rejects branch cache when branch name differs', () => {
    setCachedNarrativeReview(makeBranchCacheEntry())

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/other',
          headSha: 'head-sha',
          baseSha: 'base-sha',
        },
      }),
    ).toBeNull()
  })

  it('rejects branch cache when head sha differs', () => {
    setCachedNarrativeReview(makeBranchCacheEntry())

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/cache',
          headSha: 'different-head',
          baseSha: 'base-sha',
        },
      }),
    ).toBeNull()
  })

  it('rejects branch cache when base sha differs', () => {
    setCachedNarrativeReview(makeBranchCacheEntry())

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/cache',
          headSha: 'head-sha',
          baseSha: 'different-base',
        },
      }),
    ).toBeNull()
  })

  it('returns uncommitted cache only when diff hash and head sha match', () => {
    const entry = makeUncommittedCacheEntry()
    setCachedNarrativeReview(entry)

    expect(
      getCachedNarrativeReview({
        source: 'uncommitted',
        cacheContext: {
          source: 'uncommitted',
          headSha: 'head-sha',
          diffHash: 'diff-hash',
        },
      }),
    ).toEqual(entry)
  })

  it('rejects uncommitted cache when diff hash differs', () => {
    setCachedNarrativeReview(makeUncommittedCacheEntry())

    expect(
      getCachedNarrativeReview({
        source: 'uncommitted',
        cacheContext: {
          source: 'uncommitted',
          headSha: 'head-sha',
          diffHash: 'different-diff',
        },
      }),
    ).toBeNull()
  })

  it('prunes entries older than seven days', () => {
    setCachedNarrativeReview(makeBranchCacheEntry({ cachedAt: '2026-03-01T00:00:00.000Z' }))

    pruneExpiredNarrativeReviews(Date.parse('2026-03-13T00:00:00.000Z'))

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/cache',
          headSha: 'head-sha',
          baseSha: 'base-sha',
        },
      }),
    ).toBeNull()
  })

  it('keeps fresh entries during prune', () => {
    const entry = makeBranchCacheEntry({ cachedAt: '2026-03-12T00:00:00.000Z' })
    setCachedNarrativeReview(entry)

    pruneExpiredNarrativeReviews(Date.parse('2026-03-13T00:00:00.000Z'))

    expect(
      getCachedNarrativeReview({
        source: 'branch-diff',
        cacheContext: {
          source: 'branch-diff',
          branchName: 'feature/cache',
          headSha: 'head-sha',
          baseSha: 'base-sha',
        },
      }),
    ).toEqual(entry)
  })
})

function makeReview() {
  return {
    prTitle: 'PR',
    overviewSummary: 'Summary',
    chapters: [],
  }
}

function makePrData() {
  return {
    title: 'PR',
    body: '',
    author: 'alice',
    baseRefName: 'main',
    headRefName: 'feature/cache',
    files: [],
    diff: 'diff --git a/a b/a',
  }
}

function makeGithubCacheEntry(
  overrides: Partial<NarrativeReviewCacheEntry> = {},
): NarrativeReviewCacheEntry {
  return {
    source: 'github-pr',
    cachedAt: '2026-03-13T00:00:00.000Z',
    prRef: { owner: 'openai', repo: 'diffy', number: 12 },
    prData: makePrData(),
    review: makeReview(),
    cacheContext: { source: 'github-pr' },
    ...overrides,
  }
}

function makeBranchCacheEntry(
  overrides: Partial<NarrativeReviewCacheEntry> = {},
): NarrativeReviewCacheEntry {
  return {
    source: 'branch-diff',
    cachedAt: '2026-03-13T00:00:00.000Z',
    prData: {
      ...makePrData(),
      cacheMetadata: {
        source: 'branch-diff',
        branchName: 'feature/cache',
        headSha: 'head-sha',
        baseSha: 'base-sha',
      },
    },
    review: makeReview(),
    cacheContext: {
      source: 'branch-diff',
      branchName: 'feature/cache',
      headSha: 'head-sha',
      baseSha: 'base-sha',
    },
    ...overrides,
  }
}

function makeUncommittedCacheEntry(
  overrides: Partial<NarrativeReviewCacheEntry> = {},
): NarrativeReviewCacheEntry {
  return {
    source: 'uncommitted',
    cachedAt: '2026-03-13T00:00:00.000Z',
    prData: {
      ...makePrData(),
      title: 'Uncommitted Changes',
      headRefName: 'working tree',
      cacheMetadata: {
        source: 'uncommitted',
        headSha: 'head-sha',
        diffHash: 'diff-hash',
      },
    },
    review: makeReview(),
    cacheContext: {
      source: 'uncommitted',
      headSha: 'head-sha',
      diffHash: 'diff-hash',
    },
    ...overrides,
  }
}
