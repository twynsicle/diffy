import type { ReactElement } from 'react'

import styles from './SectionHeader.module.css'

type SectionHeaderProps = {
  label: string
  count: number
  actionLabel: string
  onAction: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
  onToggleAllFolders: () => void
  hasFolders: boolean
  hasCollapsedFolders: boolean
}

export function SectionHeader({
  label,
  count,
  actionLabel,
  onAction,
  isCollapsed,
  onToggleCollapse,
  onToggleAllFolders,
  hasFolders,
  hasCollapsedFolders,
}: SectionHeaderProps): ReactElement {
  return (
    <div className={styles.header} onClick={onToggleCollapse} role="button" tabIndex={0}>
      <span className={styles.chevron}>
        {isCollapsed ? '\u25B8' : '\u25BE'}
      </span>
      <span className={styles.label}>
        {label} <span className={styles.count}>({count})</span>
      </span>
      <span className={styles.spacer} />
      {!isCollapsed && hasFolders && (
        <button
          className={styles.collapseAll}
          onClick={(e) => {
            e.stopPropagation()
            onToggleAllFolders()
          }}
          type="button"
        >
          {hasCollapsedFolders ? 'Expand All' : 'Collapse All'}
        </button>
      )}
      {count > 0 && (
        <button
          className={styles.action}
          onClick={(e) => {
            e.stopPropagation()
            onAction()
          }}
          type="button"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
