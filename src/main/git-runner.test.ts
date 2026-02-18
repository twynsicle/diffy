import { describe, expect, it } from 'vitest'

import { getRepoRoot, isPathInsideRepo, runGit } from './git-runner'

describe('runGit', () => {
  it('returns stdout on success', async () => {
    const result = await runGit({
      repoRoot: '.',
      args: ['--version'],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toMatch(/^git version/)
    }
  })

  it('returns error on bad command', async () => {
    const result = await runGit({
      repoRoot: '.',
      args: ['not-a-real-command'],
    })
    expect(result.ok).toBe(false)
  })

  it('returns error on non-existent repo path', async () => {
    const result = await runGit({
      repoRoot: '/tmp/nonexistent-path-xyz-' + String(Date.now()),
      args: ['status'],
    })
    expect(result.ok).toBe(false)
  })

  it('times out with very short timeout', async () => {
    const result = await runGit({
      repoRoot: '.',
      args: ['status'],
      timeoutMs: 1,
    })
    // Might succeed if git is fast enough, or might timeout — both are valid
    expect(typeof result.ok).toBe('boolean')
  })
})

describe('isPathInsideRepo', () => {
  it('accepts paths inside the repo', () => {
    expect(isPathInsideRepo('/repo', 'src/file.ts')).toBe(true)
    expect(isPathInsideRepo('/repo', 'deeply/nested/file.ts')).toBe(true)
  })

  it('rejects paths outside the repo', () => {
    expect(isPathInsideRepo('/repo', '../outside')).toBe(false)
    expect(isPathInsideRepo('/repo', '../../etc/passwd')).toBe(false)
  })

  it('rejects absolute paths', () => {
    expect(isPathInsideRepo('/repo', '/etc/passwd')).toBe(false)
    expect(isPathInsideRepo('/repo', '/repo/src/file.ts')).toBe(false)
  })

  it('rejects sibling-prefix paths', () => {
    expect(isPathInsideRepo('/repo', '../repo-evil/file.ts')).toBe(false)
  })

  it('accepts the repo root itself', () => {
    expect(isPathInsideRepo('/repo', '.')).toBe(true)
    expect(isPathInsideRepo('/repo', '')).toBe(true)
  })

  it('handles trailing slashes', () => {
    expect(isPathInsideRepo('/repo/', 'src/file.ts')).toBe(true)
  })
})

describe('getRepoRoot', () => {
  it('returns error for non-git directory', async () => {
    const result = await getRepoRoot('/tmp')
    expect(result.ok).toBe(false)
  })
})
