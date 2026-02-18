import { describe, expect, it } from 'vitest'

import { detectLanguage } from './language-map'

describe('detectLanguage', () => {
  it('detects TypeScript for .ts', () => {
    expect(detectLanguage('src/main.ts')).toBe('typescript')
  })

  it('detects TypeScript for .tsx', () => {
    expect(detectLanguage('App.tsx')).toBe('typescript')
  })

  it('detects JavaScript for .js', () => {
    expect(detectLanguage('index.js')).toBe('javascript')
  })

  it('detects Python for .py', () => {
    expect(detectLanguage('script.py')).toBe('python')
  })

  it('detects Rust for .rs', () => {
    expect(detectLanguage('main.rs')).toBe('rust')
  })

  it('detects Go for .go', () => {
    expect(detectLanguage('server.go')).toBe('go')
  })

  it('detects Java for .java', () => {
    expect(detectLanguage('Main.java')).toBe('java')
  })

  it('is case insensitive for extensions', () => {
    expect(detectLanguage('file.TS')).toBe('typescript')
    expect(detectLanguage('file.PY')).toBe('python')
  })

  it('detects dockerfile by filename', () => {
    expect(detectLanguage('Dockerfile')).toBe('dockerfile')
  })

  it('detects makefile by filename', () => {
    expect(detectLanguage('Makefile')).toBe('shell')
  })

  it('returns plaintext for unknown extensions', () => {
    expect(detectLanguage('file.xyz')).toBe('plaintext')
  })

  it('returns plaintext for files with no extension', () => {
    expect(detectLanguage('LICENSE')).toBe('plaintext')
  })

  it('handles deep paths', () => {
    expect(detectLanguage('src/renderer/components/App.tsx')).toBe('typescript')
  })

  it('uses the last extension for double extensions like .test.ts', () => {
    expect(detectLanguage('utils.test.ts')).toBe('typescript')
  })

  it('detects CSS for .css', () => {
    expect(detectLanguage('styles.css')).toBe('css')
  })

  it('detects JSON for .json', () => {
    expect(detectLanguage('package.json')).toBe('json')
  })

  it('detects Markdown for .md', () => {
    expect(detectLanguage('README.md')).toBe('markdown')
  })
})
