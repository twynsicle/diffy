import { describe, expect, it } from 'vitest'

import { parseStatus } from './parse-status'

describe('parseStatus', () => {
  it('returns empty lists for empty input', () => {
    const result = parseStatus('')
    expect(result.staged).toEqual([])
    expect(result.unstaged).toEqual([])
  })

  it('parses untracked files', () => {
    const raw = '? new-file.ts'
    const result = parseStatus(raw)
    expect(result.unstaged).toHaveLength(1)
    expect(result.staged).toHaveLength(0)
    expect(result.unstaged[0]).toMatchObject({
      path: 'new-file.ts',
      section: 'unstaged',
      isUntracked: true,
      Y: 'A',
    })
  })

  it('parses staged modified file (type 1, X=M)', () => {
    const raw = '1 M. N... 100644 100644 100644 abc123 def456 src/file.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(0)
    expect(result.staged[0]).toMatchObject({
      path: 'src/file.ts',
      section: 'staged',
      X: 'M',
      isDeleted: false,
      isRenamed: false,
    })
  })

  it('parses unstaged modified file (type 1, Y=M)', () => {
    const raw = '1 .M N... 100644 100644 100644 abc123 def456 src/file.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(0)
    expect(result.unstaged).toHaveLength(1)
    expect(result.unstaged[0]).toMatchObject({
      path: 'src/file.ts',
      section: 'unstaged',
      Y: 'M',
    })
  })

  it('parses file with both staged and unstaged changes', () => {
    const raw = '1 MM N... 100644 100644 100644 abc123 def456 src/both.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(1)
    expect(result.staged[0]).toMatchObject({ path: 'src/both.ts', X: 'M' })
    expect(result.unstaged[0]).toMatchObject({ path: 'src/both.ts', Y: 'M' })
  })

  it('parses staged added file', () => {
    const raw = '1 A. N... 000000 100644 100644 0000000 abc123 new-file.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.staged[0]).toMatchObject({ path: 'new-file.ts', X: 'A' })
  })

  it('parses staged deleted file', () => {
    const raw = '1 D. N... 100644 000000 000000 abc123 0000000 deleted.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.staged[0]).toMatchObject({
      path: 'deleted.ts',
      X: 'D',
      isDeleted: true,
    })
  })

  it('parses rename entry (type 2)', () => {
    const raw = ['2 R. N... 100644 100644 100644 abc123 def456 R100 new-name.ts', 'old-name.ts'].join(
      '\0',
    )
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(0)
    expect(result.staged[0]).toMatchObject({
      path: 'new-name.ts',
      origPath: 'old-name.ts',
      displayPath: 'old-name.ts → new-name.ts',
      isRenamed: true,
      X: 'R',
    })
  })

  it('parses unmerged entry (type u) as unstaged modified', () => {
    const raw = 'u UU N... 100644 100644 100644 100644 abc123 def456 ghi789 conflict.ts'
    const result = parseStatus(raw)
    expect(result.unstaged).toHaveLength(1)
    expect(result.unstaged[0]).toMatchObject({
      path: 'conflict.ts',
      section: 'unstaged',
      Y: 'M',
    })
  })

  it('handles multiple files separated by NUL', () => {
    const raw = [
      '1 M. N... 100644 100644 100644 abc123 def456 staged.ts',
      '1 .M N... 100644 100644 100644 abc123 def456 unstaged.ts',
      '? untracked.ts',
    ].join('\0')
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(2)
  })

  it('skips ignored entries', () => {
    const raw = '! ignored-file.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(0)
    expect(result.unstaged).toHaveLength(0)
  })

  it('skips header entries', () => {
    const raw = ['# branch.oid abc123', '# branch.head main', '1 M. N... 100644 100644 100644 abc123 def456 file.ts'].join('\0')
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.unstaged).toHaveLength(0)
  })

  it('handles paths with spaces', () => {
    const raw = '1 M. N... 100644 100644 100644 abc123 def456 path with spaces/file name.ts'
    const result = parseStatus(raw)
    expect(result.staged).toHaveLength(1)
    expect(result.staged[0]).toMatchObject({
      path: 'path with spaces/file name.ts',
    })
  })

  it('handles empty tokens from trailing NUL', () => {
    const raw = '? file.ts\0'
    const result = parseStatus(raw)
    expect(result.unstaged).toHaveLength(1)
  })
})
