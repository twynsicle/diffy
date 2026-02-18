import { describe, expect, it } from 'vitest'

import { isBinary } from './detect-binary'

describe('isBinary', () => {
  it('returns false for normal text', () => {
    expect(isBinary('Hello, world!')).toBe(false)
  })

  it('returns true when NUL byte is at the start', () => {
    expect(isBinary('\0rest of content')).toBe(true)
  })

  it('returns true when NUL byte is in the middle', () => {
    expect(isBinary('abc\0def')).toBe(true)
  })

  it('returns true when NUL byte is near the end of the check range', () => {
    const content = 'x'.repeat(8191) + '\0'
    expect(isBinary(content)).toBe(true)
  })

  it('returns false when NUL byte is beyond the 8192 check boundary', () => {
    const content = 'x'.repeat(8192) + '\0'
    expect(isBinary(content)).toBe(false)
  })

  it('returns false for an empty string', () => {
    expect(isBinary('')).toBe(false)
  })

  it('returns false for very long text without NUL', () => {
    const content = 'a'.repeat(100_000)
    expect(isBinary(content)).toBe(false)
  })
})
