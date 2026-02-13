import { describe, expect, it } from 'vitest'

import type { Result } from './types'

describe('Result type', () => {
  it('represents a success result', () => {
    const result: Result<string> = { ok: true, data: 'hello' }
    expect(result.ok).toBe(true)
    expect(result).toHaveProperty('data', 'hello')
  })

  it('represents a failure result', () => {
    const result: Result<string> = { ok: false, error: 'something went wrong' }
    expect(result.ok).toBe(false)
    expect(result).toHaveProperty('error', 'something went wrong')
  })
})
