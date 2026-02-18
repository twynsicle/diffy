import { describe, expect, it } from 'vitest'

import { parseDiffChunk } from './parse-diff-chunk'

describe('parseDiffChunk', () => {
  it('handles add-only lines', () => {
    const result = parseDiffChunk('+line1\n+line2')
    expect(result.original).toBe('')
    expect(result.modified).toBe('line1\nline2')
  })

  it('handles remove-only lines', () => {
    const result = parseDiffChunk('-line1\n-line2')
    expect(result.original).toBe('line1\nline2')
    expect(result.modified).toBe('')
  })

  it('handles mixed add and remove lines', () => {
    const result = parseDiffChunk('-old\n+new')
    expect(result.original).toBe('old')
    expect(result.modified).toBe('new')
  })

  it('puts context lines (space prefix) into both sides', () => {
    const result = parseDiffChunk(' context line\n+added')
    expect(result.original).toBe('context line')
    expect(result.modified).toBe('context line\nadded')
  })

  it('puts no-prefix lines into both sides', () => {
    const result = parseDiffChunk('plain line\n+added')
    expect(result.original).toBe('plain line')
    expect(result.modified).toBe('plain line\nadded')
  })

  it('skips @@ hunk headers', () => {
    const result = parseDiffChunk('@@ -1,3 +1,4 @@\n context\n-removed\n+added')
    expect(result.original).toBe('context\nremoved')
    expect(result.modified).toBe('context\nadded')
  })

  it('returns empty strings for empty input', () => {
    const result = parseDiffChunk('')
    expect(result.original).toBe('')
    expect(result.modified).toBe('')
  })

  it('handles multiple hunk headers', () => {
    const result = parseDiffChunk('@@ -1,2 +1,2 @@\n-a\n+b\n@@ -10,2 +10,2 @@\n-c\n+d')
    expect(result.original).toBe('a\nc')
    expect(result.modified).toBe('b\nd')
  })
})
