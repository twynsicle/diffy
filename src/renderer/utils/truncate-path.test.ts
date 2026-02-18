import { describe, expect, it } from 'vitest'

import { truncatePath } from './truncate-path'

describe('truncatePath', () => {
  it('returns short paths unchanged', () => {
    expect(truncatePath('src/main.ts')).toBe('src/main.ts')
  })

  it('returns paths at exact boundary unchanged', () => {
    const path = 'a'.repeat(60)
    expect(truncatePath(path)).toBe(path)
  })

  it('truncates a single-component path with start...end', () => {
    const path = 'a'.repeat(80)
    const result = truncatePath(path)
    expect(result).toContain('...')
    expect(result.length).toBeLessThanOrEqual(60)
    expect(result.startsWith('a')).toBe(true)
    expect(result.endsWith('a')).toBe(true)
  })

  it('truncates a 2-part path with start...end', () => {
    const path = 'abcdefghijklmnop/qrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghij'
    const result = truncatePath(path)
    expect(result).toContain('...')
    expect(result.length).toBeLessThanOrEqual(60)
  })

  it('uses first/.../last for multi-segment paths', () => {
    const path = 'src/components/deep/nested/folder/MyComponent.tsx'
    const result = truncatePath(path, 40)
    expect(result).toBe('src/.../MyComponent.tsx')
  })

  it('falls back to start...end when first/.../last is too long', () => {
    const path = 'a-very-long-first-segment/middle/a-very-long-last-segment-file.tsx'
    const result = truncatePath(path, 30)
    expect(result).toContain('...')
    expect(result.length).toBeLessThanOrEqual(30)
    // Should be start...end since first/.../last would exceed maxLength
  })

  it('respects custom maxLength', () => {
    const path = 'src/renderer/components/DiffView.tsx'
    expect(truncatePath(path, 100)).toBe(path)
    expect(truncatePath(path, 20)).toContain('...')
  })
})
