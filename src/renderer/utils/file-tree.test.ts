import { describe, expect, it } from 'vitest'

import type { FileChange } from '@shared/types'

import type { TreeNodeFolder } from './file-tree'
import { buildFileTree, collectAllFolderPaths, flattenTree } from './file-tree'

function makeFile(path: string, section: 'staged' | 'unstaged' = 'unstaged'): FileChange {
  return {
    path,
    displayPath: path,
    X: section === 'staged' ? 'M' : ' ',
    Y: section === 'unstaged' ? 'M' : ' ',
    isUntracked: false,
    isRenamed: false,
    isDeleted: false,
    section,
  }
}

describe('buildFileTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildFileTree([])).toEqual([])
  })

  it('handles a single file at root level', () => {
    const tree = buildFileTree([makeFile('README.md')])
    expect(tree).toHaveLength(1)
    expect(tree[0].kind).toBe('file')
    expect(tree[0].name).toBe('README.md')
  })

  it('groups files in the same folder', () => {
    const tree = buildFileTree([
      makeFile('src/a.ts'),
      makeFile('src/b.ts'),
    ])
    expect(tree).toHaveLength(1)
    expect(tree[0].kind).toBe('folder')

    const folder = tree[0] as TreeNodeFolder
    expect(folder.name).toBe('src')
    expect(folder.children).toHaveLength(2)
    expect(folder.fileCount).toBe(2)
  })

  it('applies path compression for single-child folder chains', () => {
    const tree = buildFileTree([makeFile('a/b/c/file.ts')])
    expect(tree).toHaveLength(1)
    expect(tree[0].kind).toBe('folder')

    const folder = tree[0] as TreeNodeFolder
    expect(folder.name).toBe('a/b/c')
    expect(folder.children).toHaveLength(1)
    expect(folder.children[0].kind).toBe('file')
  })

  it('does not compress when folders have siblings', () => {
    const tree = buildFileTree([
      makeFile('a/b/file1.ts'),
      makeFile('a/c/file2.ts'),
    ])
    expect(tree).toHaveLength(1)

    const a = tree[0] as TreeNodeFolder
    expect(a.name).toBe('a')
    expect(a.children).toHaveLength(2)
    expect(a.children[0].kind).toBe('folder')
    expect(a.children[1].kind).toBe('folder')
  })

  it('sorts folders first, then files, alphabetically', () => {
    const tree = buildFileTree([
      makeFile('z-file.ts'),
      makeFile('a-dir/nested.ts'),
      makeFile('a-file.ts'),
      makeFile('m-dir/nested.ts'),
    ])

    expect(tree.map((n) => n.name)).toEqual([
      'a-dir',
      'm-dir',
      'a-file.ts',
      'z-file.ts',
    ])
  })

  it('skips entries with trailing slash (empty filename)', () => {
    const tree = buildFileTree([makeFile('www/prs/')])
    // The trailing slash produces an empty filename — should be skipped
    expect(tree).toHaveLength(0)
  })

  it('counts files recursively', () => {
    const tree = buildFileTree([
      makeFile('src/components/App.tsx'),
      makeFile('src/components/Header.tsx'),
      makeFile('src/utils/helpers.ts'),
    ])

    const src = tree[0] as TreeNodeFolder
    expect(src.fileCount).toBe(3)
  })
})

describe('flattenTree', () => {
  it('flattens all nodes when nothing is collapsed', () => {
    const tree = buildFileTree([
      makeFile('src/a.ts'),
      makeFile('src/b.ts'),
    ])
    const rows = flattenTree(tree, new Set())
    // 1 folder + 2 files
    expect(rows).toHaveLength(3)
    expect(rows[0].kind).toBe('folder')
    expect(rows[0].depth).toBe(0)
    expect(rows[1].kind).toBe('file')
    expect(rows[1].depth).toBe(1)
    expect(rows[2].kind).toBe('file')
    expect(rows[2].depth).toBe(1)
  })

  it('skips children of collapsed folders', () => {
    const tree = buildFileTree([
      makeFile('src/a.ts'),
      makeFile('src/b.ts'),
    ])
    const rows = flattenTree(tree, new Set(['src']))
    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('folder')
    if (rows[0].kind === 'folder') {
      expect(rows[0].isExpanded).toBe(false)
    }
  })

  it('handles nested folders with mixed collapse state', () => {
    const tree = buildFileTree([
      makeFile('src/components/App.tsx'),
      makeFile('src/utils/helpers.ts'),
    ])
    // Collapse src/utils but not src or src/components
    const rows = flattenTree(tree, new Set(['src/utils']))
    // src (folder) -> components (folder) -> App.tsx (file) -> utils (folder, collapsed)
    const kinds = rows.map((r) => `${r.kind}:${r.node.name}`)
    expect(kinds).toContain('folder:components')
    expect(kinds).toContain('file:App.tsx')
    expect(kinds).toContain('folder:utils')
    // helpers.ts should NOT be in the list
    expect(kinds).not.toContain('file:helpers.ts')
  })
})

describe('collectAllFolderPaths', () => {
  it('returns empty array for empty tree', () => {
    expect(collectAllFolderPaths([])).toEqual([])
  })

  it('returns all folder paths including nested', () => {
    const tree = buildFileTree([
      makeFile('src/components/App.tsx'),
      makeFile('src/utils/helpers.ts'),
      makeFile('README.md'),
    ])
    const paths = collectAllFolderPaths(tree)
    expect(paths).toContain('src')
    expect(paths).toContain('src/components')
    expect(paths).toContain('src/utils')
    expect(paths).toHaveLength(3)
  })
})
