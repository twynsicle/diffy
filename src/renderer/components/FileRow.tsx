import type { CSSProperties, ReactElement } from 'react'

import type { FileChange, Section } from '@shared/types'

import { truncatePath } from '../utils/truncate-path'

import styles from './FileRow.module.css'

export type FileRowProps = {
  files: FileChange[]
  selectedPath?: string
  onSelect: (path: string, section: Section) => void
  onAction: (path: string) => void
  actionLabel: string
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

export function FileRow({
  index,
  style,
  files,
  selectedPath,
  onSelect,
  onAction,
  actionLabel,
}: FileRowProps & {
  index: number
  style: CSSProperties
  ariaAttributes: Record<string, unknown>
}): ReactElement {
  const file = files[index]
  const statusCode = file.section === 'staged' ? file.X : file.Y
  const isSelected = file.path === selectedPath

  const rowClass = [
    styles['row'],
    isSelected ? styles['selected'] : '',
    file.isDeleted ? styles['deleted'] : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={rowClass}
      style={style}
      onClick={() => { onSelect(file.path, file.section) }}
      role="option"
      aria-selected={isSelected}
    >
      <span className={`${styles['badge'] ?? ''} ${badgeClass(statusCode)}`}>
        {statusCode ?? '?'}
      </span>
      <span className={styles['path']} title={file.displayPath}>
        {truncatePath(file.displayPath)}
      </span>
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
    </div>
  )
}
