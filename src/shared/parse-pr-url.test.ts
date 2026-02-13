import { describe, expect, it } from 'vitest'

import { parsePrUrl } from './parse-pr-url'

describe('parsePrUrl', () => {
  it('parses a standard GitHub PR URL', () => {
    expect(parsePrUrl('https://github.com/owner/repo/pull/123')).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 123,
    })
  })

  it('parses a URL with trailing /files path', () => {
    expect(parsePrUrl('https://github.com/owner/repo/pull/456/files')).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 456,
    })
  })

  it('parses a URL with trailing /commits path', () => {
    expect(parsePrUrl('https://github.com/owner/repo/pull/789/commits')).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 789,
    })
  })

  it('parses an http variant', () => {
    expect(parsePrUrl('http://github.com/owner/repo/pull/42')).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 42,
    })
  })

  it('trims whitespace', () => {
    expect(parsePrUrl('  https://github.com/owner/repo/pull/1  ')).toEqual({
      owner: 'owner',
      repo: 'repo',
      number: 1,
    })
  })

  it('returns null for non-GitHub URLs', () => {
    expect(parsePrUrl('https://gitlab.com/owner/repo/pull/123')).toBeNull()
  })

  it('returns null for non-PR GitHub URLs', () => {
    expect(parsePrUrl('https://github.com/owner/repo/issues/123')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parsePrUrl('')).toBeNull()
  })

  it('returns null for a URL missing the PR number', () => {
    expect(parsePrUrl('https://github.com/owner/repo/pull/')).toBeNull()
  })

  it('returns null for a non-numeric PR number', () => {
    expect(parsePrUrl('https://github.com/owner/repo/pull/abc')).toBeNull()
  })
})
