import { describe, expect, it } from 'vitest'

import { isExcludedFromAI } from './ai-file-filter'

describe('isExcludedFromAI', () => {
  it('excludes exact lock file names', () => {
    expect(isExcludedFromAI('package-lock.json')).toBe(true)
    expect(isExcludedFromAI('yarn.lock')).toBe(true)
    expect(isExcludedFromAI('pnpm-lock.yaml')).toBe(true)
    expect(isExcludedFromAI('cargo.lock')).toBe(true)
    expect(isExcludedFromAI('go.sum')).toBe(true)
    expect(isExcludedFromAI('bun.lockb')).toBe(true)
  })

  it('excludes .snap extension', () => {
    expect(isExcludedFromAI('Component.test.snap')).toBe(true)
  })

  it('excludes .min.js extension', () => {
    expect(isExcludedFromAI('bundle.min.js')).toBe(true)
  })

  it('excludes .min.css extension', () => {
    expect(isExcludedFromAI('styles.min.css')).toBe(true)
  })

  it('excludes .map extension', () => {
    expect(isExcludedFromAI('bundle.js.map')).toBe(true)
  })

  it('excludes .lock extension', () => {
    expect(isExcludedFromAI('something.lock')).toBe(true)
  })

  it('excludes __snapshots__/ path segment', () => {
    expect(isExcludedFromAI('src/__snapshots__/test.snap')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isExcludedFromAI('Package-Lock.JSON')).toBe(true)
    expect(isExcludedFromAI('BUNDLE.MIN.JS')).toBe(true)
    expect(isExcludedFromAI('src/__SNAPSHOTS__/test.snap')).toBe(true)
  })

  it('excludes lock files with full paths', () => {
    expect(isExcludedFromAI('path/to/package-lock.json')).toBe(true)
    expect(isExcludedFromAI('deep/nested/yarn.lock')).toBe(true)
  })

  it('does not exclude normal source files', () => {
    expect(isExcludedFromAI('src/main.ts')).toBe(false)
    expect(isExcludedFromAI('App.tsx')).toBe(false)
    expect(isExcludedFromAI('styles.css')).toBe(false)
    expect(isExcludedFromAI('README.md')).toBe(false)
  })

  it('excludes files matching user pattern by basename', () => {
    expect(isExcludedFromAI('generated.ts', ['generated.ts'])).toBe(true)
  })

  it('excludes files matching user pattern by extension', () => {
    expect(isExcludedFromAI('data.csv', ['.csv'])).toBe(true)
  })

  it('excludes files matching user pattern by path substring', () => {
    expect(isExcludedFromAI('src/vendor/lib.js', ['vendor/'])).toBe(true)
  })

  it('does not exclude when user patterns do not match', () => {
    expect(isExcludedFromAI('src/main.ts', ['vendor/', '.csv'])).toBe(false)
  })

  it('returns false for empty filename', () => {
    expect(isExcludedFromAI('')).toBe(false)
  })

  it('returns false with empty patterns array', () => {
    expect(isExcludedFromAI('src/main.ts', [])).toBe(false)
  })
})
