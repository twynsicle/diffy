import { type ReactElement, useCallback, useMemo, useState } from 'react'

import type { FileChange, PrFileChange } from '@shared/types'

import { buildFileTree, flattenTree } from '../utils/file-tree'

import styles from './NarrativeFileTree.module.css'

type NarrativeFileTreeProps = {
  files: PrFileChange[]
  selectedFile: string | null
  onSelectFile: (filename: string) => void
}

function prStatusToCode(status: string): string {
  // Normalize git status codes like "R100" or "C095" to just the letter
  const normalized = /^[A-Z]\d+$/.test(status) ? status[0] : status

  switch (normalized) {
    // GitHub API status strings
    case 'added':
      return 'A'
    case 'modified':
      return 'M'
    case 'removed':
      return 'D'
    case 'renamed':
      return 'R'
    // Git single-letter status codes (from local diff sources)
    case 'A':
    case 'M':
    case 'D':
    case 'R':
    case 'C':
    case 'T':
      return normalized
    default:
      return '?'
  }
}

function badgeClass(code: string): string {
  switch (code) {
    case 'M':
      return styles['badgeM'] ?? ''
    case 'A':
      return styles['badgeA'] ?? ''
    case 'D':
      return styles['badgeD'] ?? ''
    case 'R':
      return styles['badgeR'] ?? ''
    default:
      return styles['badgeDefault'] ?? ''
  }
}

function prFileToFileChange(pf: PrFileChange): FileChange {
  const code = prStatusToCode(pf.status)
  return {
    path: pf.filename,
    displayPath: pf.filename,
    isUntracked: code === 'A',
    isRenamed: code === 'R',
    isDeleted: code === 'D',
    X: code,
    Y: code,
    section: 'unstaged',
  }
}

export function NarrativeFileTree({
  files,
  selectedFile,
  onSelectFile,
}: NarrativeFileTreeProps): ReactElement {
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set())

  const fileChanges = useMemo(() => files.map(prFileToFileChange), [files])
  const tree = useMemo(() => buildFileTree(fileChanges), [fileChanges])
  const rows = useMemo(() => flattenTree(tree, collapsedPaths), [tree, collapsedPaths])

  const handleToggleFolder = useCallback((folderPath: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(folderPath)) {
        next.delete(folderPath)
      } else {
        next.add(folderPath)
      }
      return next
    })
  }, [])

  // Build a lookup from filename to PrFileChange status
  const statusMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const f of files) {
      map.set(f.filename, prStatusToCode(f.status))
    }
    return map
  }, [files])

  if (files.length === 0) {
    return <div className={styles['empty']}>No files</div>
  }

  return (
    <div>
      {rows.map((row) => {
        if (row.kind === 'folder') {
          const { node, isExpanded } = row
          return (
            <div
              key={`folder:${node.path}`}
              className={styles['row']}
              style={{ paddingLeft: row.depth * 12 + 12 }}
              onClick={() => { handleToggleFolder(node.path) }}
              role="treeitem"
              aria-expanded={isExpanded}
            >
              <span className={styles['chevron']}>
                {isExpanded ? '\u25BE' : '\u25B8'}
              </span>
              <span className={styles['folderName']} title={node.path}>
                {node.name}
                <span className={styles['fileCount']}>({node.fileCount})</span>
              </span>
            </div>
          )
        }

        const { node } = row
        const filePath = node.file.path
        const code = statusMap.get(filePath) ?? '?'
        const isSelected = filePath === selectedFile
        const isDeleted = code === 'D'

        const rowClass = [
          styles['row'],
          isSelected ? styles['selected'] : '',
          isDeleted ? styles['deleted'] : '',
        ]
          .filter(Boolean)
          .join(' ')

        return (
          <div
            key={`file:${filePath}`}
            className={rowClass}
            style={{ paddingLeft: row.depth * 12 + 12 }}
            onClick={() => { onSelectFile(filePath) }}
            role="option"
            aria-selected={isSelected}
          >
            <span className={`${styles['badge'] ?? ''} ${badgeClass(code)}`}>
              {code}
            </span>
            <span className={styles['fileName']} title={filePath}>
              {node.name}
            </span>
          </div>
        )
      })}
    </div>
  )
}
