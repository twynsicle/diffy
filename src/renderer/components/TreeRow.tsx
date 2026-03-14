import type { CSSProperties, ReactElement } from 'react'

import type { FileChange, Section } from '@shared/types'

import type { FlatRow } from '../utils/file-tree'

import styles from './TreeRow.module.css'

export type TreeRowProps = {
  rows: FlatRow[]
  selectedPath?: string
  onSelect: (path: string, section: Section, origPath?: string) => void
  onToggleFolder: (folderPath: string) => void
  onAction?: (path: string) => void
  actionLabel?: string
  onFolderAction?: (folderPath: string) => void
  onContextMenu?: (file: FileChange, x: number, y: number) => void
  variant?: 'default' | 'compact'
}

function badgeClass(code: string | undefined): string {
  switch (code) {
    case 'M':
      return styles['badgeM'] ?? ''
    case 'A':
      return styles['badgeA'] ?? ''
    case 'D':
      return styles['badgeD'] ?? ''
    case 'R':
    case 'C':
      return styles['badgeR'] ?? ''
    default:
      return styles['badgeDefault'] ?? ''
  }
}

export function TreeRow({
  index,
  style,
  rows,
  selectedPath,
  onSelect,
  onAction,
  actionLabel,
  onContextMenu,
  onToggleFolder,
  onFolderAction,
  variant = 'default',
}: TreeRowProps & {
  index: number
  style: CSSProperties
  ariaAttributes: Record<string, unknown>
}): ReactElement {
  const row = rows[index]
  const isCompact = variant === 'compact'
  const indent = row.depth * (isCompact ? 12 : 16)

  if (row.kind === 'folder') {
    const { node, isExpanded } = row

    const folderClass = [styles['row'], isCompact ? styles['compact'] : '']
      .filter(Boolean)
      .join(' ')

    return (
      <div
        className={folderClass}
        style={{ ...style, paddingLeft: indent + (isCompact ? 12 : 8) }}
        onClick={() => {
          onToggleFolder(node.path)
        }}
        role="treeitem"
        aria-expanded={isExpanded}
      >
        <span className={styles['chevron']}>{isExpanded ? '\u25BE' : '\u25B8'}</span>
        <span className={styles['folderName']} title={node.path}>
          {node.name} <span className={styles['fileCount']}>({node.fileCount})</span>
        </span>
        {actionLabel && onFolderAction && (
          <button
            className={styles['action']}
            onClick={(e) => {
              e.stopPropagation()
              onFolderAction(node.path)
            }}
            type="button"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )
  }

  const { node } = row
  const file = node.file
  const statusCode = file.section === 'staged' ? file.X : file.Y
  const isSelected = file.path === selectedPath

  const rowClass = [
    styles['row'],
    isCompact ? styles['compact'] : '',
    isSelected ? styles['selected'] : '',
    file.isDeleted ? styles['deleted'] : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rowClass}
      style={{ ...style, paddingLeft: indent + (isCompact ? 12 : 8) }}
      onClick={() => {
        onSelect(file.path, file.section, file.origPath)
      }}
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(file, e.clientX, e.clientY)
      }}
      role="option"
      aria-selected={isSelected}
    >
      <span className={`${styles['badge'] ?? ''} ${badgeClass(statusCode)}`}>
        {statusCode ?? '?'}
      </span>
      <span className={styles['path']} title={file.displayPath}>
        {node.name}
      </span>
      {actionLabel && onAction && (
        <button
          className={styles['action']}
          onClick={(e) => {
            e.stopPropagation()
            onAction(file.path)
          }}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
