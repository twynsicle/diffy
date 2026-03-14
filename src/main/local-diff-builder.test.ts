import { createHash } from 'node:crypto'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildBranchDiff, buildUncommittedDiff } from './local-diff-builder'

const { readFileMock, isBinaryMock, runGitMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(),
  isBinaryMock: vi.fn(),
  runGitMock: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  readFile: readFileMock,
}))

vi.mock('./detect-binary', () => ({
  isBinary: isBinaryMock,
}))

vi.mock('./git-runner', () => ({
  runGit: runGitMock,
}))

describe('local-diff-builder cache metadata', () => {
  beforeEach(() => {
    readFileMock.mockReset()
    isBinaryMock.mockReset()
    runGitMock.mockReset()
    isBinaryMock.mockReturnValue(false)
  })

  it('branch diff includes branch cache metadata', async () => {
    runGitMock.mockImplementation(
      mockGitResponses({
        'rev-parse --abbrev-ref HEAD': 'feature/cache\n',
        'rev-parse --verify main': 'base-sha\n',
        'diff main...HEAD': 'branch diff',
        'diff --name-status main...HEAD': 'M\tsrc/app.ts\n',
        'diff --numstat main...HEAD': '1\t0\tsrc/app.ts\n',
        'log --oneline main..HEAD': 'abc123 change\n',
        'config user.name': 'Alice\n',
        'rev-parse HEAD': 'head-sha\n',
        'rev-parse main': 'base-sha\n',
      }),
    )

    const result = await buildBranchDiff('/repo')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.cacheMetadata).toEqual({
      source: 'branch-diff',
      branchName: 'feature/cache',
      headSha: 'head-sha',
      baseSha: 'base-sha',
    })
  })

  it('uncommitted diff includes diff hash derived from final diff content', async () => {
    runGitMock.mockImplementation(
      mockGitResponses({
        'diff HEAD': 'tracked diff',
        'diff --name-status HEAD': 'M\tsrc/app.ts\n',
        'diff --numstat HEAD': '1\t0\tsrc/app.ts\n',
        'ls-files --others --exclude-standard': '',
        'config user.name': 'Alice\n',
        'rev-parse HEAD': 'head-sha\n',
      }),
    )

    const result = await buildUncommittedDiff('/repo')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.cacheMetadata).toEqual({
      source: 'uncommitted',
      headSha: 'head-sha',
      diffHash: sha256Hex('tracked diff'),
    })
  })

  it('untracked synthetic patches influence the uncommitted diff hash', async () => {
    runGitMock.mockImplementation(
      mockGitResponses({
        'diff HEAD': 'tracked diff',
        'diff --name-status HEAD': '',
        'diff --numstat HEAD': '',
        'ls-files --others --exclude-standard': 'new-file.ts\n',
        'config user.name': 'Alice\n',
        'rev-parse HEAD': 'head-sha\n',
      }),
    )
    readFileMock.mockResolvedValue('hello\nworld')

    const result = await buildUncommittedDiff('/repo')

    expect(result.ok).toBe(true)
    if (!result.ok) return
    const expectedDiff = [
      'tracked diff',
      'diff --git a/new-file.ts b/new-file.ts',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new-file.ts',
      '@@ -0,0 +1,2 @@',
      '+hello',
      '+world',
    ].join('\n')
    expect(result.data.diff).toBe(expectedDiff)
    expect(result.data.cacheMetadata).toEqual({
      source: 'uncommitted',
      headSha: 'head-sha',
      diffHash: sha256Hex(expectedDiff),
    })
  })
})

function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf-8').digest('hex')
}

function mockGitResponses(
  responses: Partial<Record<string, string>>,
): ({ args }: { args: string[] }) => { ok: true; data: string } | { ok: false; error: string } {
  return ({ args }: { args: string[] }) => {
    const key = args.join(' ')
    const value = responses[key]

    if (value === undefined) {
      return { ok: false, error: `Unexpected args: ${key}` }
    }

    return { ok: true, data: value }
  }
}
