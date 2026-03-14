import { describe, expect, it } from 'vitest'

import { parseNarrativeReview } from './anthropic-client'
import { buildDiffHunkIndex } from './diff-hunk-catalog'

describe('parseNarrativeReview hunk resolution', () => {
  it('drops diff chunks that have no valid hunks', () => {
    const input = `<narrative_review>
{
  "prTitle": "Test",
  "overviewSummary": "Summary",
  "chapters": [
    {
      "id": "c1",
      "title": "Chapter 1",
      "insights": [],
      "diffChunks": [
        {
          "filename": "src/a.ts",
          "language": "typescript",
          "hunkIds": ["H9999"]
        }
      ]
    }
  ]
}
</narrative_review>`

    const result = parseNarrativeReview(input, buildDiffHunkIndex(''))
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.chapters[0]?.diffChunks).toEqual([])
  })

  it('resolves, deduplicates, and sorts hunks from hunk IDs', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -10,2 +20,3 @@',
      '-old',
      '+new',
      '@@ -30 +40,2 @@',
      '-x',
      '+y',
      'diff --git a/src/b.ts b/src/b.ts',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -1 +1 @@',
      '-p',
      '+q',
    ].join('\n')
    const hunkIndex = buildDiffHunkIndex(diff)

    const input = `<narrative_review>
{
  "prTitle": "Test",
  "overviewSummary": "Summary",
  "chapters": [
    {
      "id": "c1",
      "title": "Chapter 1",
      "insights": [],
      "diffChunks": [
        {
          "filename": "src/a.ts",
          "language": "typescript",
          "hunkIds": ["H0002", "H0001", "H0001"]
        }
      ]
    }
  ]
}
</narrative_review>`

    const result = parseNarrativeReview(input, hunkIndex)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.chapters[0]?.diffChunks[0]?.hunks).toEqual([
      {
        id: 'H0001',
        fileOrder: 1,
        original: { startLine: 10, lineCount: 2 },
        modified: { startLine: 20, lineCount: 3 },
      },
      {
        id: 'H0002',
        fileOrder: 2,
        original: { startLine: 30, lineCount: 1 },
        modified: { startLine: 40, lineCount: 2 },
      },
    ])
  })

  it('ignores unknown or wrong-file hunk IDs', () => {
    const diff = [
      'diff --git a/src/a.ts b/src/a.ts',
      '--- a/src/a.ts',
      '+++ b/src/a.ts',
      '@@ -1 +5 @@',
      '-a',
      '+b',
      'diff --git a/src/b.ts b/src/b.ts',
      '--- a/src/b.ts',
      '+++ b/src/b.ts',
      '@@ -2 +8 @@',
      '-x',
      '+y',
    ].join('\n')
    const hunkIndex = buildDiffHunkIndex(diff)

    const input = `<narrative_review>
{
  "prTitle": "Test",
  "overviewSummary": "Summary",
  "chapters": [
    {
      "id": "c1",
      "title": "Chapter 1",
      "insights": [],
      "diffChunks": [
        {
          "filename": "src/a.ts",
          "language": "typescript",
          "hunkIds": ["H9999", "H0002", "H0001"]
        }
      ]
    }
  ]
}
</narrative_review>`

    const result = parseNarrativeReview(input, hunkIndex)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.chapters[0]?.diffChunks[0]?.hunks).toEqual([
      {
        id: 'H0001',
        fileOrder: 1,
        original: { startLine: 1, lineCount: 1 },
        modified: { startLine: 5, lineCount: 1 },
      },
    ])
  })
})
