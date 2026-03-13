import { describe, expect, it } from 'vitest'

import type { PrData, PrFileChange } from '@shared/types'

import { buildNarrativePrompt } from './narrative-prompt'

function makePrFile(filename: string, overrides?: Partial<PrFileChange>): PrFileChange {
  return {
    filename,
    status: 'modified',
    additions: 10,
    deletions: 5,
    patch: `--- a/${filename}\n+++ b/${filename}\n@@ -1,3 +1,3 @@\n-old\n+new`,
    ...overrides,
  }
}

function makePrData(overrides?: Partial<PrData>): PrData {
  return {
    title: 'Test PR',
    body: 'Test body',
    author: 'testuser',
    baseRefName: 'main',
    headRefName: 'feature',
    files: [makePrFile('src/index.ts'), makePrFile('src/utils.ts')],
    diff: 'diff --git a/src/index.ts b/src/index.ts\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1 +1 @@\n-old\n+new\ndiff --git a/src/utils.ts b/src/utils.ts\n--- a/src/utils.ts\n+++ b/src/utils.ts\n@@ -1 +1 @@\n-old\n+new',
    ...overrides,
  }
}

describe('buildNarrativePrompt', () => {
  it('returns an object with system, user, wasTruncated, and hunkIndex', () => {
    const result = buildNarrativePrompt(makePrData())
    expect(result).toHaveProperty('system')
    expect(result).toHaveProperty('user')
    expect(result).toHaveProperty('wasTruncated')
    expect(result).toHaveProperty('hunkIndex')
  })

  it('system prompt contains narrative review instructions', () => {
    const { system } = buildNarrativePrompt(makePrData())
    expect(system).toContain('narrative review')
    expect(system).toContain('<narrative_review>')
    expect(system).toContain('chapters')
    expect(system).toContain('hunkIds')
  })

  it('user prompt includes PR title', () => {
    const { user } = buildNarrativePrompt(makePrData({ title: 'Add auth feature' }))
    expect(user).toContain('Add auth feature')
  })

  it('user prompt includes author', () => {
    const { user } = buildNarrativePrompt(makePrData({ author: 'alice' }))
    expect(user).toContain('alice')
  })

  it('user prompt includes branch names', () => {
    const { user } = buildNarrativePrompt(makePrData({ baseRefName: 'main', headRefName: 'feat/auth' }))
    expect(user).toContain('feat/auth')
    expect(user).toContain('main')
  })

  it('user prompt includes body', () => {
    const { user } = buildNarrativePrompt(makePrData({ body: 'Implements OAuth2 flow' }))
    expect(user).toContain('Implements OAuth2 flow')
  })

  it('shows "(no description)" for empty body', () => {
    const { user } = buildNarrativePrompt(makePrData({ body: '' }))
    expect(user).toContain('(no description)')
  })

  it('includes file list in user prompt', () => {
    const { user } = buildNarrativePrompt(makePrData())
    expect(user).toContain('src/index.ts')
    expect(user).toContain('src/utils.ts')
  })

  it('includes changed hunk ID catalog in user prompt', () => {
    const { user } = buildNarrativePrompt(makePrData())
    expect(user).toContain('Changed Hunks')
    expect(user).toContain('H0001')
    expect(user).toContain('H0002')
  })

  it('includes file count in user prompt', () => {
    const { user } = buildNarrativePrompt(makePrData())
    expect(user).toContain('Files Changed (2)')
  })

  it('filters excluded files from the file list', () => {
    const prData = makePrData({
      files: [makePrFile('src/index.ts'), makePrFile('package-lock.json')],
    })
    const { user } = buildNarrativePrompt(prData)
    expect(user).toContain('src/index.ts')
    expect(user).not.toContain('package-lock.json')
    expect(user).toContain('Files Changed (1)')
  })

  it('filters excluded files from the diff', () => {
    const prData = makePrData({
      files: [makePrFile('src/index.ts'), makePrFile('yarn.lock')],
      diff: 'diff --git a/src/index.ts b/src/index.ts\n-old\n+new\ndiff --git a/yarn.lock b/yarn.lock\n-old\n+new',
    })
    const { user } = buildNarrativePrompt(prData)
    expect(user).toContain('src/index.ts')
    expect(user).not.toContain('yarn.lock')
  })

  it('returns wasTruncated false for small diffs', () => {
    const { wasTruncated } = buildNarrativePrompt(makePrData())
    expect(wasTruncated).toBe(false)
  })

  it('returns wasTruncated true for diffs exceeding character limit', () => {
    const largePatch = 'x'.repeat(400_000)
    const prData = makePrData({
      diff: `diff --git a/big.ts b/big.ts\n${largePatch}`,
    })
    const { wasTruncated } = buildNarrativePrompt(prData)
    expect(wasTruncated).toBe(true)
  })

  it('appends truncation note when truncated', () => {
    const largePatch = 'x\n'.repeat(200_000)
    const prData = makePrData({
      diff: `diff --git a/big.ts b/big.ts\n${largePatch}`,
    })
    const { user } = buildNarrativePrompt(prData)
    expect(user).toContain('truncated')
  })

  it('filters files by user patterns', () => {
    const prData = makePrData({
      files: [makePrFile('src/index.ts'), makePrFile('src/generated.ts')],
      diff: 'diff --git a/src/index.ts b/src/index.ts\n-old\n+new\ndiff --git a/src/generated.ts b/src/generated.ts\n-old\n+new',
    })
    const { user } = buildNarrativePrompt(prData, ['generated.ts'])
    expect(user).toContain('src/index.ts')
    expect(user).not.toContain('generated.ts')
  })
})
